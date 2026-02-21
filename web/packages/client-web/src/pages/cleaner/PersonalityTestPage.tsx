import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, ClipboardList, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@go2fix/shared';
import {
  PERSONALITY_QUESTIONS,
  MY_PERSONALITY_ASSESSMENT,
  SUBMIT_PERSONALITY_ASSESSMENT,
  MY_CLEANER_PROFILE,
} from '@/graphql/operations';

const LIKERT_OPTIONS = [
  { value: 1, label: 'Dezacord total' },
  { value: 2, label: 'Dezacord' },
  { value: 3, label: 'Nici acord, nici dezacord' },
  { value: 4, label: 'Acord' },
  { value: 5, label: 'Acord total' },
];

interface Question {
  number: number;
  facetCode: string;
  text: string;
}

export default function PersonalityTestPage() {
  const navigate = useNavigate();
  const { data: questionsData, loading: questionsLoading } = useQuery(PERSONALITY_QUESTIONS);
  const { data: assessmentData, loading: assessmentLoading } = useQuery(MY_PERSONALITY_ASSESSMENT);
  const [submitAssessment, { loading: submitting }] = useMutation(
    SUBMIT_PERSONALITY_ASSESSMENT,
    {
      refetchQueries: [{ query: MY_CLEANER_PROFILE }],
      awaitRefetchQueries: true, // Wait for refetch before mutation resolves
    },
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showIntro, setShowIntro] = useState(true);

  const questions: Question[] = questionsData?.personalityQuestions || [];
  const alreadyCompleted = !!assessmentData?.myPersonalityAssessment;
  const currentQuestion = questions[currentIndex];
  const progress = (Object.keys(answers).length / questions.length) * 100;
  const allAnswered = Object.keys(answers).length === questions.length;
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleAnswer = (response: number) => {
    if (!currentQuestion) return;

    // Save the answer
    setAnswers({ ...answers, [currentQuestion.number]: response });

    // Auto-advance to next question (except on last question)
    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 400); // 400ms delay for visual feedback
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;

    const answerArray = Object.entries(answers).map(([qNum, resp]) => ({
      questionNumber: parseInt(qNum),
      response: resp,
    }));

    try {
      await submitAssessment({ variables: { answers: answerArray } });
      navigate('/worker');
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    }
  };

  if (questionsLoading || assessmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Test finalizat
            </h1>
            <p className="text-gray-600 mb-6">
              Ai completat deja testul de personalitate. Contul tău este în așteptarea activării de către administrator.
            </p>
            <Button onClick={() => navigate('/worker')}>
              Înapoi la dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <div className="py-8 px-4">
            <ClipboardList className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Test de personalitate
            </h1>
            <div className="space-y-4 text-gray-600 mb-8">
              <p>
                Bine ai venit! Pentru a finaliza procesul de înregistrare, trebuie să completezi un scurt chestionar de personalitate.
              </p>
              <p>
                Acest test ne ajută să înțelegem mai bine personalitatea ta și să asigurăm o potrivire bună între tine și clienții noștri.
              </p>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex gap-2">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Câteva detalii importante:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>28 de întrebări, ~5 minute</li>
                      <li>Nu există răspunsuri corecte sau greșite</li>
                      <li>Răspunde sincer și spontan</li>
                      <li>Poți reveni la întrebări anterioare</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowIntro(false)} size="lg" className="w-full">
              Începe testul
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto mt-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Întrebarea {currentIndex + 1} din {questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% completat
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <Card className="mb-6">
        <div className="text-center py-8">
          <p className="text-2xl font-semibold text-gray-900 mb-8">
            {currentQuestion.text}
          </p>

          <div className="space-y-3 max-w-md mx-auto">
            {LIKERT_OPTIONS.map((option) => {
              const isSelected = answers[currentQuestion.number] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={cn(
                    'w-full py-3.5 px-5 rounded-xl border-2 font-medium transition-all duration-200',
                    'hover:border-blue-600/50 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600/30',
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Înapoi
        </Button>

        <div className="text-sm text-gray-500">
          {allAnswered ? 'Toate răspunsurile completate' : `${questions.length - Object.keys(answers).length} răspunsuri rămase`}
        </div>

        {isLastQuestion && allAnswered && (
          <Button onClick={handleSubmit} loading={submitting}>
            Trimite
            <CheckCircle className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
