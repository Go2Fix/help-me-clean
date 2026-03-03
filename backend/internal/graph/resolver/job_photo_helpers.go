package resolver

import (
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// dbJobPhotoToGQL converts a db.BookingJobPhoto to *model.BookingJobPhoto
func dbJobPhotoToGQL(p db.BookingJobPhoto) *model.BookingJobPhoto {
	return &model.BookingJobPhoto{
		ID:         uuidToString(p.ID),
		BookingID:  uuidToString(p.BookingID),
		UploadedBy: uuidToString(p.UploadedBy),
		PhotoURL:   p.PhotoUrl,
		Phase:      p.Phase,
		SortOrder:  int(p.SortOrder),
		CreatedAt:  timestamptzToTime(p.CreatedAt),
	}
}
