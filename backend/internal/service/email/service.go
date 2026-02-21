package email

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

// Service sends transactional emails via SMTP.
// When SMTP is not configured and ENVIRONMENT != "production", sending is skipped
// and the caller receives skipped=true — the OTP code is then returned to the client
// as devCode for easy local testing without a mail server.
type Service struct {
	host       string
	port       string
	user       string
	pass       string
	from       string
	configured bool
	isProd     bool
}

// NewService reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SENDER_EMAIL from env.
func NewService() *Service {
	host := os.Getenv("SMTP_HOST")
	return &Service{
		host:       host,
		port:       os.Getenv("SMTP_PORT"),
		user:       os.Getenv("SMTP_USER"),
		pass:       os.Getenv("SMTP_PASS"),
		from:       os.Getenv("SENDER_EMAIL"),
		configured: host != "",
		isProd:     os.Getenv("ENVIRONMENT") == "production",
	}
}

// SendOTP sends a 6-digit OTP code to the given address.
//
// Returns (skipped=true, nil) in non-production environments — the caller will
// expose devCode in the GraphQL response instead of sending a real email.
// Returns an error when SMTP is unconfigured in production, or when the send fails.
func (s *Service) SendOTP(to, code string) (skipped bool, err error) {
	// Development / staging — never send real email; caller will surface devCode.
	if !s.isProd {
		return true, nil
	}
	if !s.configured {
		return false, fmt.Errorf("email service not configured: set SMTP_HOST in environment")
	}

	subject := "Codul tău de autentificare Go2Fix"
	body := buildOTPEmail(code)

	addr := s.host + ":" + s.port
	msg := []byte(strings.Join([]string{
		"From: Go2Fix <" + s.from + ">",
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=\"UTF-8\"",
		"",
		body,
	}, "\r\n"))

	var smtpAuth smtp.Auth
	if s.user != "" {
		smtpAuth = smtp.PlainAuth("", s.user, s.pass, s.host)
	}

	if err := smtp.SendMail(addr, smtpAuth, s.from, []string{to}, msg); err != nil {
		return false, fmt.Errorf("smtp send failed: %w", err)
	}
	return false, nil
}

// buildOTPEmail returns a minimal branded HTML email with the OTP code.
func buildOTPEmail(code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAFBFC;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <div style="margin-bottom:24px;">
    <span style="font-size:24px;font-weight:800;color:#2563EB;">Go2Fix</span>
  </div>
  <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px 0;">
    Codul tău de autentificare
  </h2>
  <p style="color:#6B7280;font-size:14px;margin:0 0 24px 0;">
    Folosește codul de mai jos pentru a te autentifica pe Go2Fix.ro.<br>
    Codul este valabil <strong>10 minute</strong>.
  </p>
  <div style="background:#EFF6FF;border:2px solid #2563EB;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:24px;">
    <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#2563EB;font-family:'Courier New',monospace;">%s</span>
  </div>
  <p style="color:#9CA3AF;font-size:12px;margin:0;">
    Dacă nu ai solicitat acest cod, poți ignora acest email în siguranță.
  </p>
</div>
</body>
</html>`, code)
}
