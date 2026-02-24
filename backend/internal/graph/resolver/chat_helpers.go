package resolver

import (
	"context"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// enrichChatRoomList loads participants and last message for a list of chat rooms,
// batching user lookups to avoid N+1 queries.
func (r *queryResolver) enrichChatRoomList(ctx context.Context, rooms []db.ChatRoom) ([]*model.ChatRoom, error) {
	// Phase 1: Load participants + last messages for all rooms, collecting user IDs.
	type roomData struct {
		participants []db.ChatParticipant
		lastMsg      *db.ChatMessage
	}
	perRoom := make([]roomData, len(rooms))
	userIDs := map[string]bool{}

	for i, room := range rooms {
		if participants, err := r.Queries.ListChatParticipants(ctx, room.ID); err == nil {
			perRoom[i].participants = participants
			for _, p := range participants {
				userIDs[uuidToString(p.UserID)] = true
			}
		}
		if lastMsg, err := r.Queries.GetLastChatMessage(ctx, room.ID); err == nil {
			perRoom[i].lastMsg = &lastMsg
			userIDs[uuidToString(lastMsg.SenderID)] = true
		}
	}

	// Phase 2: Load all unique users once.
	userMap := map[string]*model.User{}
	for uid := range userIDs {
		if u, err := r.Queries.GetUserByID(ctx, stringToUUID(uid)); err == nil {
			userMap[uid] = dbUserToGQL(u)
		}
	}

	// Phase 3: Assemble results.
	result := make([]*model.ChatRoom, len(rooms))
	for i, room := range rooms {
		gqlRoom := dbChatRoomToGQL(room)

		var gqlParticipants []*model.ChatParticipant
		for _, p := range perRoom[i].participants {
			if u, ok := userMap[uuidToString(p.UserID)]; ok {
				gqlParticipants = append(gqlParticipants, &model.ChatParticipant{
					User:     u,
					JoinedAt: timestamptzToTime(p.JoinedAt),
				})
			}
		}
		gqlRoom.Participants = gqlParticipants

		if perRoom[i].lastMsg != nil {
			lastMsg := dbChatMessageToGQL(*perRoom[i].lastMsg)
			if u, ok := userMap[uuidToString(perRoom[i].lastMsg.SenderID)]; ok {
				lastMsg.Sender = u
			}
			gqlRoom.LastMessage = lastMsg
		}

		result[i] = gqlRoom
	}

	return result, nil
}
