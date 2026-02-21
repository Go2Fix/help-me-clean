package auth

import (
	"net/http"
	"os"
)

const (
	// AuthCookieName is the name of the httpOnly cookie storing the JWT token
	AuthCookieName = "go2fix_token"

	// jwtExpirySeconds is the cookie expiry time (24 hours = 86400 seconds)
	// This must match the JWT token expiry in jwt.go (24 * time.Hour)
	jwtExpirySeconds = 86400
)

// SetAuthCookie sets a secure httpOnly cookie with the JWT token.
// This protects against XSS attacks as the token cannot be accessed via JavaScript.
func SetAuthCookie(w http.ResponseWriter, token string) {
	isProduction := os.Getenv("ENVIRONMENT") == "production"

	cookie := &http.Cookie{
		Name:     AuthCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,                 // ✅ Prevents XSS attacks - JavaScript cannot access this cookie
		Secure:   isProduction,         // ✅ HTTPS only in production
		SameSite: http.SameSiteLaxMode, // ✅ CSRF protection - cookie not sent in cross-site POST requests
		MaxAge:   jwtExpirySeconds,
	}

	// Set domain for cross-subdomain access in production (e.g., .go2fix.ro)
	if isProduction {
		if domain := os.Getenv("COOKIE_DOMAIN"); domain != "" {
			cookie.Domain = domain
		}
	}

	http.SetCookie(w, cookie)
}

// ClearAuthCookie removes the authentication cookie (for logout).
func ClearAuthCookie(w http.ResponseWriter) {
	isProduction := os.Getenv("ENVIRONMENT") == "production"

	cookie := &http.Cookie{
		Name:     AuthCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   isProduction,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1, // ✅ Delete immediately
	}

	// Match domain from SetAuthCookie for proper deletion
	if isProduction {
		if domain := os.Getenv("COOKIE_DOMAIN"); domain != "" {
			cookie.Domain = domain
		}
	}

	http.SetCookie(w, cookie)
}

// GetAuthCookie extracts the JWT token from the httpOnly cookie.
func GetAuthCookie(r *http.Request) string {
	cookie, err := r.Cookie(AuthCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}
