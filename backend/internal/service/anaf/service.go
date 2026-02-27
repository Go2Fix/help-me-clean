// Package anaf provides a client for the Romanian Tax Administration (ANAF)
// public API. It is the single point of contact for all ANAF calls in the
// backend — both the registration-form proxy and the admin verification flow.
package anaf

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
)

const anafEndpoint = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

// ErrUnavailable is returned when the ANAF API cannot be reached (network
// error, timeout, or unexpected HTTP status). Callers should treat this as a
// transient failure and surface a 503 to the end user.
var ErrUnavailable = errors.New("anaf: service unavailable")

// Result holds every field that the backend needs from a successful ANAF
// lookup. It serves both the registration-form auto-fill (DenumireTitled,
// City, County, StreetAddr, Telefon, NrRegCom, CodCAEN) and the admin
// verification panel (DenumireRaw, DataInfiintare, ScpTva, Inactive).
//
// When Found is false all other fields are zero values.
type Result struct {
	Found bool

	// Registration form auto-fill fields.
	DenumireTitled string // title-cased company name (for form pre-population)
	Adresa         string // raw address string returned by ANAF
	City           string // parsed from Adresa
	County         string // parsed from Adresa
	StreetAddr     string // parsed from Adresa
	Telefon        string
	NrRegCom       string
	CodCAEN        string

	// Admin verification fields.
	DenumireRaw    string // original ALL-CAPS name as returned by ANAF
	DataInfiintare string // "data_inregistrare" from date_generale (YYYY-MM-DD)
	ScpTva         bool   // true = VAT payer
	Inactive       bool   // true = fiscally inactive

	// NOTE: Verify exact JSON field names for statusTvaInactivi and scpTva against a live API call.
}

// anafRequest is the per-item payload sent to the ANAF v9 endpoint.
type anafRequest struct {
	CUI  int    `json:"cui"`
	Data string `json:"data"`
}

// anafResponse mirrors the top-level JSON object returned by ANAF v9.
type anafResponse struct {
	Found []anafFoundItem `json:"found"`
}

type anafFoundItem struct {
	DateGenerale    anafDateGenerale `json:"date_generale"`
	StatusTvaInactivi bool           `json:"statusTvaInactivi"`
	ScpTva          bool             `json:"scpTva"`
}

type anafDateGenerale struct {
	Denumire         string `json:"denumire"`
	Adresa           string `json:"adresa"`
	NrRegCom         string `json:"nrRegCom"`
	Telefon          string `json:"telefon"`
	CodCAEN          string `json:"cod_CAEN"`
	DataInregistrare string `json:"data_inregistrare"`
}

// Lookup queries the ANAF v9 REST API for the company identified by cui.
//
// cui may include an optional "RO" prefix (e.g. "RO12345678" or "12345678").
// Invalid or non-numeric CUIs return (&Result{Found: false}, nil) — they are
// not treated as errors because the caller should handle them gracefully.
//
// A network failure or non-2xx HTTP response returns ErrUnavailable.
func Lookup(ctx context.Context, cui string) (*Result, error) {
	// Strip optional "RO" prefix and whitespace.
	normalized := strings.TrimSpace(strings.TrimPrefix(strings.ToUpper(strings.TrimSpace(cui)), "RO"))
	cuiNum, err := strconv.Atoi(normalized)
	if err != nil || cuiNum <= 0 {
		return &Result{Found: false}, nil
	}

	today := time.Now().Format("2006-01-02")
	payload, err := json.Marshal([]anafRequest{{CUI: cuiNum, Data: today}})
	if err != nil {
		return nil, fmt.Errorf("anaf: failed to marshal request: %w", err)
	}

	httpClient := &http.Client{Timeout: 10 * time.Second}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, anafEndpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("anaf: failed to build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return nil, ErrUnavailable
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, ErrUnavailable
	}

	var anafResp anafResponse
	if err := json.NewDecoder(resp.Body).Decode(&anafResp); err != nil || len(anafResp.Found) == 0 {
		return &Result{Found: false}, nil
	}

	item := anafResp.Found[0]
	dg := item.DateGenerale

	city, county, streetAddr := ParseANAFAddress(dg.Adresa)

	return &Result{
		Found:          true,
		DenumireRaw:    strings.TrimSpace(dg.Denumire),
		DenumireTitled: TitleCaseRO(strings.TrimSpace(dg.Denumire)),
		Adresa:         strings.TrimSpace(dg.Adresa),
		City:           city,
		County:         county,
		StreetAddr:     streetAddr,
		Telefon:        strings.TrimSpace(dg.Telefon),
		NrRegCom:       strings.TrimSpace(dg.NrRegCom),
		CodCAEN:        strings.TrimSpace(dg.CodCAEN),
		DataInfiintare: strings.TrimSpace(dg.DataInregistrare),
		ScpTva:         item.ScpTva,
		Inactive:       item.StatusTvaInactivi,
	}, nil
}

// TitleCaseRO converts an ALL-CAPS Romanian string to Title Case using
// unicode-safe rune operations. Exported so that callers (e.g. app.go) can
// use this helper without re-implementing it.
func TitleCaseRO(s string) string {
	words := strings.Fields(strings.ToLower(s))
	for i, w := range words {
		runes := []rune(w)
		if len(runes) > 0 {
			runes[0] = unicode.ToUpper(runes[0])
			words[i] = string(runes)
		}
	}
	return strings.Join(words, " ")
}

// ParseANAFAddress splits the ANAF flat address string into (city, county, street).
//
// ANAF format examples:
//
//	"MUNICIPIUL BUCUREȘTI, SECTOR 1, STR. XYZ, NR. 1, AP. 2"
//	"MUNICIPIUL CLUJ-NAPOCA, JUD. CLUJ, STR. XYZ, NR. 5"
//
// Exported so that app.go can delegate to it after moving the logic here.
func ParseANAFAddress(adresa string) (city, county, street string) {
	parts := strings.SplitN(adresa, ", ", 3)
	if len(parts) == 0 {
		return "", "", adresa
	}

	cityRaw := strings.TrimSpace(parts[0])
	for _, pfx := range []string{"MUNICIPIUL ", "ORAȘ ", "ORAŞ ", "COMUNĂ ", "COMUNA ", "SAT ", "SECTOR "} {
		if strings.HasPrefix(cityRaw, pfx) {
			cityRaw = strings.TrimPrefix(cityRaw, pfx)
			break
		}
	}
	city = TitleCaseRO(cityRaw)

	if len(parts) < 2 {
		return city, "", ""
	}

	countyRaw := strings.TrimSpace(parts[1])
	for _, pfx := range []string{"JUDEȚ ", "JUDET ", "JUDEȚUL ", "JUDETUL ", "JUD. ", "JUD "} {
		if strings.HasPrefix(countyRaw, pfx) {
			countyRaw = strings.TrimPrefix(countyRaw, pfx)
			break
		}
	}
	county = TitleCaseRO(countyRaw)

	if len(parts) < 3 {
		return city, county, ""
	}

	street = TitleCaseRO(strings.TrimSpace(parts[2]))
	return city, county, street
}
