-- name: CreatePersonalityAssessment :one
INSERT INTO personality_assessments (
    worker_id,
    trust_score, morality_score, altruism_score,
    orderliness_score, dutifulness_score, self_discipline_score, cautiousness_score,
    integrity_avg, work_quality_avg,
    has_concerns, flagged_facets
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
) RETURNING *;

-- name: CreatePersonalityAnswer :exec
INSERT INTO personality_assessment_answers (
    assessment_id, question_number, facet_code,
    is_reverse_keyed, raw_response, scored_value
) VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetPersonalityAssessmentByWorkerID :one
SELECT * FROM personality_assessments WHERE worker_id = $1;

-- name: GetPersonalityAnswersByAssessmentID :many
SELECT * FROM personality_assessment_answers
WHERE assessment_id = $1
ORDER BY question_number ASC;

-- name: HasPersonalityAssessment :one
SELECT EXISTS(
    SELECT 1 FROM personality_assessments WHERE worker_id = $1
) AS has_assessment;
