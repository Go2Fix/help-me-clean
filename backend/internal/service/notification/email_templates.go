package notification

import (
	"fmt"
	"sort"
	"strings"
)

// ─── Shared helpers ──────────────────────────────────────────────────────────

// payloadStr extracts a string value from a Payload map.
// Returns the fallback (or empty string) if the key is absent or not a string.
func payloadStr(p Payload, key string, fallback ...string) string {
	if p != nil {
		if v, ok := p[key]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	if len(fallback) > 0 {
		return fallback[0]
	}
	return ""
}

// ctaButton renders a full-width, primary-blue CTA button suitable for all email clients.
func ctaButton(label, url string) string {
	return fmt.Sprintf(`
<table width="100%%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px 0;">
  <tr>
    <td align="center">
      <a href="%s" style="display:inline-block;background:#2563EB;color:#ffffff;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">%s</a>
    </td>
  </tr>
</table>`, url, label)
}

// infoRow renders a single labeled key-value row inside an info card.
func infoRow(label, value string) string {
	return fmt.Sprintf(`
  <tr>
    <td style="padding:10px 16px;border-bottom:1px solid #E5E7EB;">
      <span style="display:block;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-family:'Inter',Arial,sans-serif;">%s</span>
      <span style="display:block;font-size:14px;font-weight:500;color:#111827;font-family:'Inter',Arial,sans-serif;margin-top:2px;">%s</span>
    </td>
  </tr>`, label, value)
}

// infoCard wraps a set of infoRow strings inside a styled gray card.
func infoCard(rows ...string) string {
	return fmt.Sprintf(`
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin:20px 0 24px 0;">
  %s
</table>`, strings.Join(rows, ""))
}

// alertBanner renders a colored full-width banner at the top of the email body.
// color can be: "emerald" | "blue" | "amber" | "red"
func alertBanner(color, text string) string {
	bg, border, fg := "#10B981", "#059669", "#ffffff"
	switch color {
	case "blue":
		bg, border, fg = "#2563EB", "#1D4ED8", "#ffffff"
	case "amber":
		bg, border, fg = "#F59E0B", "#D97706", "#ffffff"
	case "red":
		bg, border, fg = "#EF4444", "#DC2626", "#ffffff"
	}
	return fmt.Sprintf(`
<table width="100%%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:%s;border-bottom:3px solid %s;padding:18px 40px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:%s;font-family:'Inter',Arial,sans-serif;">%s</p>
    </td>
  </tr>
</table>`, bg, border, fg, text)
}

// sectionLabel renders a small uppercase category label above a heading.
func sectionLabel(label string) string {
	return fmt.Sprintf(`<p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1.5px;font-family:'Inter',Arial,sans-serif;">%s</p>`, label)
}

// preheader returns a hidden preheader span for inbox preview text.
func preheader(text string) string {
	return fmt.Sprintf(`<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">%s</span>`, text)
}

// bodyPad wraps content in the standard body padding cell.
func bodyPad(content string) string {
	return fmt.Sprintf(`
<table width="100%%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:32px 40px 36px 40px;">
      %s
    </td>
  </tr>
</table>`, content)
}

// greeting renders the salutation line.
func greeting(name string) string {
	if name == "" {
		name = "utilizator"
	}
	return fmt.Sprintf(`<p style="margin:0 0 20px 0;font-size:15px;color:#6B7280;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">%s</strong>,</p>`, name)
}

// signOff renders the closing "Cu drag" signature.
func signOff() string {
	return `<p style="margin:24px 0 0 0;font-size:14px;color:#6B7280;font-family:'Inter',Arial,sans-serif;">Cu drag,<br><strong style="color:#111827;">Echipa Go2Fix</strong></p>`
}

// ─── Plain-text generation ────────────────────────────────────────────────────

const textFooter = `
──────────────────────────────────────
Go2Fix SRL | București, România
go2fix.ro | contact@go2fix.ro
© 2026 Go2Fix SRL. Toate drepturile rezervate.

Ai primit acest email deoarece ai un cont activ sau o rezervare pe Go2Fix.ro.
Setări notificări: https://go2fix.ro/cont/setari#notificari
Politică de confidențialitate: https://go2fix.ro/politica-confidentialitate`

// buildEventText returns a plain-text alternative for the given event.
func buildEventText(event Event, subject, name string, payload Payload) string {
	if name == "" {
		name = "utilizator"
	}
	var body string
	switch event {
	case EventOTPCode:
		code := payloadStr(payload, "code")
		body = fmt.Sprintf("Codul tău de verificare Go2Fix este:\n\n  %s\n\nCodul este valabil 10 minute de la primire.\n\nDacă nu ai solicitat acest cod, ignoră acest mesaj — contul tău nu este afectat.", code)
	case EventWelcomeClient:
		body = "Bun venit pe Go2Fix! Platforma ta pentru servicii de curățenie la domiciliu.\n\nPoți crea prima ta rezervare la: https://go2fix.ro/rezervare"
	case EventWelcomeCompanyAdmin:
		body = "Bun venit pe Go2Fix! Contul companiei tale a fost creat.\n\nAccesează tabloul de bord la: https://go2fix.ro/firma"
	case EventWelcomeWorker:
		body = "Bun venit în echipa Go2Fix! Contul tău de lucrător a fost creat.\n\nAccesează tabloul de bord la: https://go2fix.ro/worker"
	case EventBookingConfirmedClient:
		refCode := payloadStr(payload, "referenceCode")
		service := payloadStr(payload, "serviceName")
		date := payloadStr(payload, "scheduledDate")
		timeStr := payloadStr(payload, "scheduledTime")
		total := payloadStr(payload, "estimatedTotal")
		bookingID := payloadStr(payload, "bookingId")
		body = fmt.Sprintf("Rezervarea ta a fost confirmată!\n\nCod rezervare: %s\nServiciu: %s\nData: %s\nOra: %s\nTotal estimat: %s\n\nVezi detalii: https://go2fix.ro/cont/comenzi/%s", refCode, service, date, timeStr, total, bookingID)
	case EventBookingNewRequestCompany:
		refCode := payloadStr(payload, "referenceCode")
		service := payloadStr(payload, "serviceName")
		date := payloadStr(payload, "scheduledDate")
		timeStr := payloadStr(payload, "scheduledTime")
		client := payloadStr(payload, "clientName")
		bookingID := payloadStr(payload, "bookingId")
		body = fmt.Sprintf("Ai primit o rezervare nouă!\n\nCod: %s\nServiciu: %s\nData: %s\nOra: %s\nClient: %s\n\nGestionează comanda: https://go2fix.ro/firma/comenzi/%s", refCode, service, date, timeStr, client, bookingID)
	case EventBookingWorkerAssignedClient:
		worker := payloadStr(payload, "workerName")
		refCode := payloadStr(payload, "referenceCode")
		service := payloadStr(payload, "serviceName")
		date := payloadStr(payload, "scheduledDate")
		bookingID := payloadStr(payload, "bookingId")
		body = fmt.Sprintf("Lucrătorul tău a fost desemnat!\n\nLucrător: %s\nCod rezervare: %s\nServiciu: %s\nData: %s\n\nVezi detalii: https://go2fix.ro/cont/comenzi/%s", worker, refCode, service, date, bookingID)
	case EventJobAssignedWorker:
		refCode := payloadStr(payload, "referenceCode")
		client := payloadStr(payload, "clientName")
		service := payloadStr(payload, "serviceName")
		date := payloadStr(payload, "scheduledDate")
		bookingID := payloadStr(payload, "bookingId")
		body = fmt.Sprintf("Ai un job nou asignat!\n\nCod: %s\nClient: %s\nServiciu: %s\nData: %s\n\nVezi detalii: https://go2fix.ro/worker/comenzi/%s", refCode, client, service, date, bookingID)
	case EventBookingCompleted:
		refCode := payloadStr(payload, "referenceCode")
		reviewURL := payloadStr(payload, "reviewUrl")
		body = fmt.Sprintf("Serviciul tău a fost finalizat! Comanda %s este acum completă.\n\nLasă o recenzie pentru a ajuta alți clienți: %s", refCode, reviewURL)
	case EventBookingCancelledByClient, EventBookingCancelledByAdmin:
		refCode := payloadStr(payload, "referenceCode")
		reason := payloadStr(payload, "reason")
		body = fmt.Sprintf("Comanda %s a fost anulată.", refCode)
		if reason != "" {
			body += fmt.Sprintf("\n\nMotiv: %s", reason)
		}
		body += "\n\nPentru o nouă rezervare, vizitează go2fix.ro."
	case EventBookingRescheduled:
		refCode := payloadStr(payload, "referenceCode")
		newDate := payloadStr(payload, "newDate")
		newTime := payloadStr(payload, "newTime")
		body = fmt.Sprintf("Rezervarea ta a fost reprogramată.\n\nCod: %s\nData nouă: %s\nOra nouă: %s", refCode, newDate, newTime)
	case EventCompanyApplicationReceived:
		body = "Cererea ta de înregistrare a companiei pe Go2Fix a fost primită!\n\nEchipa noastră o va revizui în 1–3 zile lucrătoare. Vei fi notificat pe email cu rezultatul."
	case EventCompanyApproved:
		body = "Felicitări! Compania ta a fost aprobată pe Go2Fix.\n\nAccesează acum tabloul de bord: https://go2fix.ro/firma"
	case EventCompanyRejected:
		reason := payloadStr(payload, "reason")
		body = "Cererea companiei tale a necesitat ajustări."
		if reason != "" {
			body += fmt.Sprintf("\n\nMotiv: %s", reason)
		}
		body += "\n\nContactează-ne pentru asistență: contact@go2fix.ro"
	case EventWorkerInvited:
		companyName := payloadStr(payload, "companyName")
		acceptURL := payloadStr(payload, "acceptUrl")
		body = fmt.Sprintf("Ai primit o invitație să te alături echipei %s pe Go2Fix!\n\nAcceptă invitația: %s", companyName, acceptURL)
	case EventInvoiceReady:
		invoiceNumber := payloadStr(payload, "invoiceNumber")
		total := payloadStr(payload, "total")
		body = fmt.Sprintf("Factura ta este disponibilă.\n\nNumăr: %s\nTotal: %s\n\nVezi facturile tale: https://go2fix.ro/cont/facturi", invoiceNumber, total)
	case EventWaitlistJoined:
		city := payloadStr(payload, "city")
		body = "Ești pe lista de așteptare Go2Fix!"
		if city != "" {
			body += fmt.Sprintf("\n\nVei fi primul notificat când Go2Fix devine disponibil în %s.", city)
		}
	default:
		body = buildFallbackText(subject, name, payload)
	}

	return fmt.Sprintf("Go2Fix\n══════════════════════════════════════\n%s\n\nSalut %s,\n\n%s\n%s", subject, name, body, textFooter)
}

// buildFallbackText renders payload key-value pairs as clean plain text.
func buildFallbackText(subject, name string, payload Payload) string {
	if len(payload) == 0 {
		return "Ai o notificare nouă de la Go2Fix.\n\nCu drag,\nEchipa Go2Fix"
	}
	// Sort keys for deterministic output.
	keys := make([]string, 0, len(payload))
	for k := range payload {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var sb strings.Builder
	for _, k := range keys {
		sb.WriteString(fmt.Sprintf("%s: %v\n", k, payload[k]))
	}
	return sb.String() + "\nCu drag,\nEchipa Go2Fix"
}

// ─── Auth templates ───────────────────────────────────────────────────────────

func buildWelcomeClientHTML(name string) string {
	body := bodyPad(
		preheader("Creează prima ta rezervare de curățenie în câteva minute.") +
			sectionLabel("Bun venit") +
			`<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#111827;line-height:1.3;font-family:'Inter',Arial,sans-serif;">Bun venit pe Go2Fix!</h1>` +
			greeting(name) +
			`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Suntem bucuroși să te avem alături. Pe Go2Fix găsești servicii de curățenie profesionale, disponibile rapid în București și în curând în toată România.</p>
			<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Iată ce poți face acum:</p>
			<ul style="margin:8px 0 16px 20px;padding:0;font-size:14px;color:#374151;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
			  <li>Creează o rezervare de curățenie</li>
			  <li>Urmărește statusul comenzilor tale în timp real</li>
			  <li>Lasă recenzii pentru a ajuta comunitatea</li>
			</ul>` +
			ctaButton("Explorează Go2Fix", "https://go2fix.ro/cont") +
			signOff(),
	)
	return emailWrapper(body)
}

func buildWelcomeCompanyHTML(name, companyName string) string {
	title := "Bun venit pe Go2Fix!"
	if companyName != "" {
		title = fmt.Sprintf("Bun venit, %s!", companyName)
	}
	body := bodyPad(
		preheader("Contul companiei tale este configurat. Accesează tabloul de bord.") +
			sectionLabel("Cont companie") +
			fmt.Sprintf(`<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#111827;line-height:1.3;font-family:'Inter',Arial,sans-serif;">%s</h1>`, title) +
			greeting(name) +
			`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Contul companiei tale a fost creat cu succes pe Go2Fix. Poți acum să înceapă să primești comenzi, să gestionezi lucrătorii și să urmărești toate activitățile din tabloul de bord.</p>
			<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Pași următori:</p>
			<ul style="margin:8px 0 16px 20px;padding:0;font-size:14px;color:#374151;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
			  <li>Completează profilul companiei</li>
			  <li>Adaugă lucrătorii din echipa ta</li>
			  <li>Așteptați aprobarea platformei (1–3 zile lucrătoare)</li>
			</ul>` +
			ctaButton("Mergi la tabloul de bord", "https://go2fix.ro/firma") +
			signOff(),
	)
	return emailWrapper(body)
}

func buildWelcomeWorkerHTML(name string) string {
	body := bodyPad(
		preheader("Contul tău de lucrător Go2Fix este activ. Descoperă comenzile disponibile.") +
			sectionLabel("Bun venit în echipă") +
			`<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#111827;line-height:1.3;font-family:'Inter',Arial,sans-serif;">Bun venit în echipa Go2Fix!</h1>` +
			greeting(name) +
			`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Contul tău de lucrător a fost creat. Vei primi notificări când compania ta îți alocă comenzi noi.</p>
			<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Prin tabloul de bord poți:</p>
			<ul style="margin:8px 0 16px 20px;padding:0;font-size:14px;color:#374151;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
			  <li>Vedea comenzile alocate și detaliile acestora</li>
			  <li>Actualiza statusul joburilor în timp real</li>
			  <li>Gestiona programul tău de lucru</li>
			</ul>` +
			ctaButton("Accesează contul de lucrător", "https://go2fix.ro/worker") +
			signOff(),
	)
	return emailWrapper(body)
}

// ─── Booking templates ────────────────────────────────────────────────────────

func buildBookingConfirmedHTML(name string, payload Payload) string {
	bookingID := payloadStr(payload, "bookingId")
	body := alertBanner("emerald", "✓ Rezervarea ta a fost confirmată!") +
		bodyPad(
			preheader(fmt.Sprintf("Rezervare %s confirmată. Detalii complete în interior.", payloadStr(payload, "referenceCode")))+
				`<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, rezervarea ta a fost înregistrată cu succes. Iată un rezumat al comenzii tale:</p>`+
				infoCard(
					infoRow("Cod rezervare", payloadStr(payload, "referenceCode")),
					infoRow("Serviciu", payloadStr(payload, "serviceName")),
					infoRow("Data", payloadStr(payload, "scheduledDate")),
					infoRow("Ora", payloadStr(payload, "scheduledTime")),
					infoRow("Total estimat", payloadStr(payload, "estimatedTotal")),
				)+
				ctaButton("Vezi detalii rezervare", fmt.Sprintf("https://go2fix.ro/cont/comenzi/%s", bookingID))+
				`<p style="margin:16px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;font-family:'Inter',Arial,sans-serif;">Poți anula sau modifica rezervarea cu cel puțin 24h înainte de ora programată.</p>`,
		)
	return emailWrapper(body)
}

func buildBookingNewRequestHTML(name string, payload Payload) string {
	bookingID := payloadStr(payload, "bookingId")
	body := alertBanner("blue", "Comandă nouă primită") +
		bodyPad(
			preheader(fmt.Sprintf("Comandă nouă %s — verifică detaliile și alocă un lucrător.", payloadStr(payload, "referenceCode")))+
				`<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, ai primit o rezervare nouă. Revizuiește detaliile și alocă un lucrător cât mai curând.</p>`+
				infoCard(
					infoRow("Cod rezervare", payloadStr(payload, "referenceCode")),
					infoRow("Serviciu", payloadStr(payload, "serviceName")),
					infoRow("Data", payloadStr(payload, "scheduledDate")),
					infoRow("Ora", payloadStr(payload, "scheduledTime")),
					infoRow("Client", payloadStr(payload, "clientName")),
					infoRow("Total estimat", payloadStr(payload, "estimatedTotal")),
				)+
				ctaButton("Gestionează comanda", fmt.Sprintf("https://go2fix.ro/firma/comenzi/%s", bookingID)),
		)
	return emailWrapper(body)
}

func buildWorkerAssignedClientHTML(name string, payload Payload) string {
	bookingID := payloadStr(payload, "bookingId")
	workerName := payloadStr(payload, "workerName", "Un lucrător")
	body := alertBanner("emerald", fmt.Sprintf("Lucrătorul tău a fost desemnat: %s", workerName)) +
		bodyPad(
			preheader(fmt.Sprintf("%s va fi la tine pe %s.", workerName, payloadStr(payload, "scheduledDate")))+
				`<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, lucrătorul alocat pentru comanda ta este gata de lucru!</p>`+
				infoCard(
					infoRow("Lucrător", workerName),
					infoRow("Cod rezervare", payloadStr(payload, "referenceCode")),
					infoRow("Serviciu", payloadStr(payload, "serviceName")),
					infoRow("Data", payloadStr(payload, "scheduledDate")),
				)+
				ctaButton("Vezi detalii rezervare", fmt.Sprintf("https://go2fix.ro/cont/comenzi/%s", bookingID)),
		)
	return emailWrapper(body)
}

func buildJobAssignedWorkerHTML(name string, payload Payload) string {
	bookingID := payloadStr(payload, "bookingId")
	body := alertBanner("blue", "Ai un job nou asignat") +
		bodyPad(
			preheader(fmt.Sprintf("Job nou %s pe %s — verifică detaliile.", payloadStr(payload, "referenceCode"), payloadStr(payload, "scheduledDate")))+
				`<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, ai un job nou alocat. Verifică detaliile și pregătește-te!</p>`+
				infoCard(
					infoRow("Cod rezervare", payloadStr(payload, "referenceCode")),
					infoRow("Client", payloadStr(payload, "clientName")),
					infoRow("Serviciu", payloadStr(payload, "serviceName")),
					infoRow("Data", payloadStr(payload, "scheduledDate")),
				)+
				ctaButton("Acceptă și pregătește-te", fmt.Sprintf("https://go2fix.ro/worker/comenzi/%s", bookingID)),
		)
	return emailWrapper(body)
}

func buildBookingCompletedHTML(name string, payload Payload) string {
	refCode := payloadStr(payload, "referenceCode")
	reviewURL := payloadStr(payload, "reviewUrl", "https://go2fix.ro/cont/comenzi")
	body := alertBanner("emerald", "✓ Serviciul a fost finalizat!") +
		bodyPad(
			preheader(fmt.Sprintf("Comanda %s este completă. Lasă o recenzie!", refCode))+
				`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, curățenia a fost finalizată cu succes. Sperăm că ești mulțumit(ă) de rezultat!</p>
				<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Recenziile tale ajută alți clienți să ia decizii mai bune și îi motivează pe lucrătorii noștri. Durează mai puțin de un minut.</p>`+
				infoCard(
					infoRow("Cod rezervare", refCode),
					infoRow("Serviciu", payloadStr(payload, "serviceName")),
				)+
				ctaButton("Lasă o recenzie", reviewURL)+
				`<p style="margin:12px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;font-family:'Inter',Arial,sans-serif;">Mulțumim că ai ales Go2Fix!</p>`,
		)
	return emailWrapper(body)
}

func buildBookingCancelledHTML(name string, payload Payload, event Event) string {
	color := "amber"
	banner := "Rezervare anulată"
	if event == EventBookingCancelledByAdmin {
		color = "red"
		banner = "Rezervarea a fost anulată de platformă"
	}
	reason := payloadStr(payload, "reason")
	rows := []string{infoRow("Cod rezervare", payloadStr(payload, "referenceCode"))}
	if reason != "" {
		rows = append(rows, infoRow("Motiv", reason))
	}
	extra := `<p style="margin:12px 0 0 0;font-size:13px;color:#6B7280;line-height:1.6;font-family:'Inter',Arial,sans-serif;">Poți face o rezervare nouă oricând pe go2fix.ro.</p>`
	body := alertBanner(color, banner) +
		bodyPad(
			preheader(fmt.Sprintf("Comanda %s a fost anulată.", payloadStr(payload, "referenceCode")))+
				`<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>,</p>`+
				infoCard(rows...)+
				extra,
		)
	return emailWrapper(body)
}

func buildBookingRescheduledHTML(name string, payload Payload) string {
	body := alertBanner("amber", "Rezervare reprogramată") +
		bodyPad(
			preheader(fmt.Sprintf("Comanda ta a fost reprogramată pentru %s la ora %s.", payloadStr(payload, "newDate"), payloadStr(payload, "newTime")))+
				`<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, rezervarea ta a fost reprogramată la data și ora de mai jos:</p>`+
				infoCard(
					infoRow("Cod rezervare", payloadStr(payload, "referenceCode")),
					infoRow("Data nouă", payloadStr(payload, "newDate")),
					infoRow("Ora nouă", payloadStr(payload, "newTime")),
				)+
				signOff(),
		)
	return emailWrapper(body)
}

// ─── Company templates ────────────────────────────────────────────────────────

func buildCompanyApplicationHTML(name string) string {
	body := alertBanner("blue", "Cererea ta a fost primită") +
		bodyPad(
			preheader("Echipa noastră va revizui cererea în 1–3 zile lucrătoare.")+
				`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, mulțumim pentru aplicare! Cererea de înregistrare a companiei tale pe Go2Fix a fost primită.</p>
				<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Echipa noastră va revizui informațiile furnizate și te va contacta <strong>în 1–3 zile lucrătoare</strong> cu un răspuns.</p>
				<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Dacă ai întrebări, ne poți contacta oricând la <a href="mailto:contact@go2fix.ro" style="color:#2563EB;">contact@go2fix.ro</a>.</p>`+
				signOff(),
		)
	return emailWrapper(body)
}

func buildCompanyApprovedHTML(name string) string {
	body := alertBanner("emerald", "✓ Compania ta a fost aprobată pe Go2Fix!") +
		bodyPad(
			preheader("Felicitări! Contul companiei tale este activ. Accesează tabloul de bord acum.")+
				`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Felicitări, <strong style="color:#111827;">`+htmlEscape(name)+`</strong>! Compania ta a fost aprobată și poate începe să primească comenzi pe Go2Fix.</p>
				<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Ce poți face acum:</p>
				<ul style="margin:8px 0 16px 20px;padding:0;font-size:14px;color:#374151;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
				  <li>Completează profilul companiei cu fotografii și descriere</li>
				  <li>Adaugă membrii echipei tale</li>
				  <li>Așteptați primele rezervări — veți fi notificați automat</li>
				</ul>`+
				ctaButton("Mergi la tabloul de bord", "https://go2fix.ro/firma")+
				signOff(),
		)
	return emailWrapper(body)
}

func buildCompanyRejectedHTML(name string, payload Payload) string {
	reason := payloadStr(payload, "reason")
	reasonBlock := ""
	if reason != "" {
		reasonBlock = infoCard(infoRow("Motiv", reason))
	}
	body := alertBanner("amber", "Actualizare cerere companie") +
		bodyPad(
			preheader("Cererea companiei necesită ajustări. Contactează-ne pentru detalii.")+
				`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, am revizuit cererea companiei tale și, din păcate, nu a putut fi aprobată la acest moment.</p>`+
				reasonBlock+
				`<p style="margin:12px 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Echipa noastră îți poate oferi mai multe detalii și te poate ghida prin procesul de reaplicare.</p>`+
				ctaButton("Contactează suportul", "mailto:contact@go2fix.ro")+
				signOff(),
		)
	return emailWrapper(body)
}

// ─── Worker templates ─────────────────────────────────────────────────────────

func buildWorkerInvitedHTML(name string, payload Payload) string {
	companyName := payloadStr(payload, "companyName", "o companie")
	acceptURL := payloadStr(payload, "acceptUrl", "https://go2fix.ro")
	body := alertBanner("blue", fmt.Sprintf("Invitație: alătură-te echipei %s", companyName)) +
		bodyPad(
			preheader(fmt.Sprintf("Compania %s te invită să lucrezi pe Go2Fix. Acceptă acum.", companyName))+
				`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>,</p>
				<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Compania <strong>`+htmlEscape(companyName)+`</strong> te invită să faci parte din echipa lor pe Go2Fix, platforma de servicii de curățenie profesionale.</p>
				<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Ca lucrător Go2Fix vei putea:</p>
				<ul style="margin:8px 0 16px 20px;padding:0;font-size:14px;color:#374151;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
				  <li>Primi și gestiona comenzi direct din aplicație</li>
				  <li>Urmări câștigurile și programul tău</li>
				  <li>Comunica direct cu clienții</li>
				</ul>`+
				ctaButton("Acceptă invitația", acceptURL)+
				`<p style="margin:12px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;font-family:'Inter',Arial,sans-serif;">Invitația expiră în curând. Dacă nu dorești să accepți, ignoră acest email.</p>`,
		)
	return emailWrapper(body)
}

// ─── Invoice templates ────────────────────────────────────────────────────────

func buildInvoiceReadyHTML(name string, payload Payload) string {
	body := alertBanner("blue", "Factura ta este disponibilă") +
		bodyPad(
			preheader(fmt.Sprintf("Factura %s este disponibilă pentru descărcare.", payloadStr(payload, "invoiceNumber")))+
				`<p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, factura pentru serviciul tău este disponibilă.</p>`+
				infoCard(
					infoRow("Număr factură", payloadStr(payload, "invoiceNumber")),
					infoRow("Total", payloadStr(payload, "total")),
				)+
				ctaButton("Vezi facturile mele", "https://go2fix.ro/cont/facturi")+
				`<p style="margin:12px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;font-family:'Inter',Arial,sans-serif;">Facturile sunt păstrate în contul tău timp de 5 ani conform legislației în vigoare.</p>`,
		)
	return emailWrapper(body)
}

// ─── Waitlist template ────────────────────────────────────────────────────────

func buildWaitlistHTML(name string, payload Payload) string {
	city := payloadStr(payload, "city")
	cityLine := ""
	if city != "" {
		cityLine = fmt.Sprintf(`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Vei fi printre primii notificați când Go2Fix devine disponibil în <strong>%s</strong>.</p>`, htmlEscape(city))
	}
	body := alertBanner("emerald", "✓ Ești pe lista de așteptare Go2Fix!") +
		bodyPad(
			preheader("Te vom anunța primul când lansăm în orașul tău.")+
				`<p style="margin:0 0 12px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Salut <strong style="color:#111827;">`+htmlEscape(name)+`</strong>, te-am adăugat cu succes pe lista noastră de așteptare!</p>`+
				cityLine+
				`<p style="margin:0 0 4px 0;font-size:15px;color:#374151;line-height:1.7;font-family:'Inter',Arial,sans-serif;">Între timp, poți urmări noutățile Go2Fix pe:</p>
				<p style="margin:8px 0 0 0;font-size:14px;color:#374151;font-family:'Inter',Arial,sans-serif;">
				  <a href="https://instagram.com/go2fix.ro" style="color:#2563EB;text-decoration:none;">Instagram</a>
				  &nbsp;&middot;&nbsp;
				  <a href="https://facebook.com/go2fix.ro" style="color:#2563EB;text-decoration:none;">Facebook</a>
				</p>`+
				signOff(),
		)
	return emailWrapper(body)
}

// ─── Utility ─────────────────────────────────────────────────────────────────

// htmlEscape escapes the five special HTML characters.
// Used to safely inject user-supplied strings into HTML templates.
func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")
	return s
}
