package handler

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

const (
	youdaoAPIURL    = "https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4"
	youdaoSecretKey = "t2he2k4m2g6QKRigK0KAmSpXKgAezywG"
	youdaoClient    = "webmain"
	youdaoKeyfrom   = "webmain"
)

type TranslateHandler struct{}

func NewTranslateHandler() *TranslateHandler {
	return &TranslateHandler{}
}

func (h *TranslateHandler) Register(r chi.Router) {
	r.Post("/api/translate", h.translate)
}

func (h *TranslateHandler) translate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Text == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}

	translation, audioUS, audioUK := lookup(req.Text)
	writeJSON(w, http.StatusOK, map[string]string{
		"translation": translation,
		"audio_us":    audioUS,
		"audio_uk":    audioUK,
	})
}

func sign(q string) (string, string) {
	a := len(q + youdaoKeyfrom) % 10
	ts := strconv.FormatInt(time.Now().UnixMilli(), 10)
	r := ts + strconv.Itoa(a)

	h1 := md5.Sum([]byte(q + youdaoKeyfrom))
	i := fmt.Sprintf("%x", h1)

	h2 := md5.Sum([]byte(youdaoClient + q + r + youdaoSecretKey + i))
	return fmt.Sprintf("%x", h2), r
}

func lookup(text string) (translation, audioUS, audioUK string) {
	sig, ts := sign(text)

	form := url.Values{}
	form.Set("q", text)
	form.Set("le", "en")
	form.Set("t", ts)
	form.Set("client", youdaoClient)
	form.Set("sign", sig)
	form.Set("keyfrom", youdaoKeyfrom)

	req, err := http.NewRequest("POST", youdaoAPIURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", "", ""
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	req.Header.Set("Referer", "https://youdao.com/")
	req.Header.Set("Origin", "https://youdao.com")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", ""
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return "", "", ""
	}

	// Sentence translation (fanyi.tran)
	if fanyi, ok := data["fanyi"].(map[string]interface{}); ok {
		if tran, ok := fanyi["tran"].(string); ok && tran != "" {
			return tran, "", ""
		}
	}

	// Word/phrase dictionary (ec.word)
	translation, audioUS, audioUK = extractEC(data, text)
	return translation, audioUS, audioUK
}

// extractEC parses jsonapi_s response: ec.word is an object with trs[*].pos + trs[*].tran
func extractEC(data map[string]interface{}, wordText string) (translation, audioUS, audioUK string) {
	for _, key := range []string{"ec", "ce"} {
		ec, ok := data[key].(map[string]interface{})
		if !ok {
			continue
		}
		word, ok := ec["word"].(map[string]interface{})
		if !ok {
			continue
		}

		// Audio URLs for pronunciation
		if wordText != "" {
			audioUS = "https://dict.youdao.com/dictvoice?audio=" + url.QueryEscape(wordText) + "&type=2"
			audioUK = "https://dict.youdao.com/dictvoice?audio=" + url.QueryEscape(wordText) + "&type=1"
		}

		trs, ok := word["trs"].([]interface{})
		if !ok {
			continue
		}

		var parts []string
		for _, trsItem := range trs {
			trObj, ok := trsItem.(map[string]interface{})
			if !ok {
				continue
			}
			pos, _ := trObj["pos"].(string)
			tran, _ := trObj["tran"].(string)
			if tran != "" {
				if pos != "" {
					parts = append(parts, pos+" "+tran)
				} else {
					parts = append(parts, tran)
				}
			}
		}
		if len(parts) > 0 {
			return joinStrings(parts, "\n"), audioUS, audioUK
		}
	}
	return "", "", ""
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

func joinStrings(parts []string, sep string) string {
	result := ""
	for i, p := range parts {
		if i > 0 {
			result += sep
		}
		result += p
	}
	return result
}
