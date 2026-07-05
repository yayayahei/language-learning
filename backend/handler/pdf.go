package handler

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/auth"
	"github.com/yayayahei/language-learning/backend/db"
)

const maxUploadSize = 50 << 20

type PDFHandler struct {
	db        *db.DB
	uploadDir string
}

func NewPDFHandler(d *db.DB) *PDFHandler {
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	os.MkdirAll(uploadDir, 0755)
	return &PDFHandler{db: d, uploadDir: uploadDir}
}

func (h *PDFHandler) Register(r chi.Router) {
	r.Post("/api/pdfs", h.upload)
	r.Get("/api/pdfs", h.list)
	r.Get("/api/pdfs/{id}/file", h.serveFile)
	r.Get("/api/pdfs/{id}/position", h.getPosition)
	r.Put("/api/pdfs/{id}/position", h.savePosition)
	r.Post("/api/pdfs/{id}/position", h.savePosition)
	r.Delete("/api/pdfs/{id}", h.delete)
}

func (h *PDFHandler) upload(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "File too large (max 50MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "No file provided")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" {
		writeError(w, http.StatusBadRequest, "Only PDF files are supported")
		return
	}

	id := uuid()
	storedName := id + ".pdf"
	destPath := filepath.Join(h.uploadDir, storedName)

	dst, err := os.Create(destPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	title := strings.TrimSuffix(header.Filename, ".pdf")
	_, err = h.db.Conn().Exec(
		"INSERT INTO pdf_documents (id, filename, title, file_path, user_id) VALUES (?, ?, ?, ?, ?)",
		id, header.Filename, title, destPath, userID,
	)
	if err != nil {
		os.Remove(destPath)
		writeError(w, http.StatusInternalServerError, "Failed to save PDF metadata")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id, "title": title})
}

func (h *PDFHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	rows, err := h.db.Conn().Query(
		"SELECT id, filename, title, last_page, created_at FROM pdf_documents WHERE user_id = ? ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list PDFs")
		return
	}
	defer rows.Close()

	var pdfs []map[string]interface{}
	for rows.Next() {
		var id, filename, title, createdAt string
		var lastPage int
		if err := rows.Scan(&id, &filename, &title, &lastPage, &createdAt); err != nil {
			continue
		}
		pdfs = append(pdfs, map[string]interface{}{
			"id":         id,
			"filename":   filename,
			"title":      title,
			"last_page":  lastPage,
			"created_at": createdAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"pdfs": pdfs})
}

func (h *PDFHandler) delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	id := chi.URLParam(r, "id")

	var filePath string
	err := h.db.Conn().QueryRow(
		"SELECT file_path FROM pdf_documents WHERE id = ? AND user_id = ?", id, userID,
	).Scan(&filePath)
	if err != nil {
		writeError(w, http.StatusNotFound, "PDF not found")
		return
	}

	_, err = h.db.Conn().Exec("DELETE FROM pdf_documents WHERE id = ? AND user_id = ?", id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete PDF")
		return
	}

	os.Remove(filePath)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *PDFHandler) serveFile(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var filePath string
	err := h.db.Conn().QueryRow(
		"SELECT file_path FROM pdf_documents WHERE id = ?", id,
	).Scan(&filePath)
	if err != nil {
		writeError(w, http.StatusNotFound, "PDF not found")
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	http.ServeFile(w, r, filePath)
}

func (h *PDFHandler) getPosition(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	page, err := h.db.GetPDFPosition(id)
	if err != nil {
		fmt.Printf("[POSITION] GET FAILED id=%s err=%v\n", id, err)
		writeError(w, http.StatusInternalServerError, "Failed to get position")
		return
	}
	fmt.Printf("[POSITION] GET id=%s page=%d\n", id, page)
	writeJSON(w, http.StatusOK, map[string]interface{}{"last_page": page})
}

func (h *PDFHandler) savePosition(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Page int `json:"page"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("[POSITION] SAVE FAILED parse body: id=%s err=%v\n", id, err)
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Page < 1 {
		fmt.Printf("[POSITION] SAVE FAILED bad page: id=%s page=%d\n", id, req.Page)
		writeError(w, http.StatusBadRequest, "page must be >= 1")
		return
	}
	if err := h.db.SavePDFPosition(id, req.Page); err != nil {
		fmt.Printf("[POSITION] SAVE FAILED db: id=%s page=%d err=%v\n", id, req.Page, err)
		writeError(w, http.StatusInternalServerError, "Failed to save position")
		return
	}
	fmt.Printf("[POSITION] SAVED id=%s page=%d\n", id, req.Page)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func uuid() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
