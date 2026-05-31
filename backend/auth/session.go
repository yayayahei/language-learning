package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

var sessionSecret []byte

func InitSecret() {
	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		fmt.Fprintln(os.Stderr, "WARNING: SESSION_SECRET not set, using insecure default")
		secret = "dev-secret-change-me-in-production-32bytes"
	}
	sessionSecret = []byte(secret)
}

func WriteSessionCookie(w http.ResponseWriter, userID int64) {
	expiry := time.Now().Add(30 * 24 * time.Hour).Unix()
	payload := fmt.Sprintf("%d.%d", userID, expiry)
	sig := sign(payload)
	cookieValue := payload + "." + sig

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    cookieValue,
		Expires:  time.Unix(expiry, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})
}

func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})
}

func ParseSessionCookie(r *http.Request) (int64, error) {
	cookie, err := r.Cookie("session")
	if err != nil {
		return 0, fmt.Errorf("no session cookie")
	}
	return parseSessionValue(cookie.Value)
}

func parseSessionValue(value string) (int64, error) {
	parts := strings.Split(value, ".")
	if len(parts) != 3 {
		return 0, fmt.Errorf("invalid session format")
	}

	payload := parts[0] + "." + parts[1]
	expectedSig := sign(payload)
	if !hmac.Equal([]byte(expectedSig), []byte(parts[2])) {
		return 0, fmt.Errorf("invalid session signature")
	}

	expiry, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid expiry")
	}
	if time.Now().Unix() > expiry {
		return 0, fmt.Errorf("session expired")
	}

	userID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid user id")
	}
	return userID, nil
}

func sign(payload string) string {
	mac := hmac.New(sha256.New, sessionSecret)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
