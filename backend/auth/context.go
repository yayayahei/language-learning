package auth

import "net/http"

type contextKey string

const UserIDKey contextKey = "user_id"

func GetUserID(r *http.Request) (int64, bool) {
	id, ok := r.Context().Value(UserIDKey).(int64)
	return id, ok
}
