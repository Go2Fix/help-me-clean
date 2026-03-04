import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, CheckCircle, ClipboardList, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@go2fix/shared';
import {
  PERSONALITY_QUESTIONS,
  MY_PERSONALITY_ASSESSMENT,
  SUBMIT_PERSONALITY_ASSESSMENT,
  MY_WORKER_PROFILE,
} from '@/graphql/operations';

interface Question {
  number: number;
  facetCode: string;
  text: string;
}

export default function PersonalityTestPage() {
  const { t } = useTranslation(['dashboard', 'worker']);
  const navigate = useNavigate();
  const { data: questionsData, loading: questionsLoading } = useQuery(PERSONALITY_QUESTIONS, {
    fetchPolicy: 'cache-first',
  });
  const { data: assessmentData, loading: assessmentLoading } = useQuery(MY_PERSONALITY_ASSESSMENT);
  const [submitAssessment, { loading: submitting }] = useMutation(
    SUBMIT_PERSONALITY_ASSESSMENT,
    {
      refetchQueries: [{ query: MY_WORKER_PROFILE }],
      awaitRefetchQueries: true,
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

  const likertOptions = [
    { value: 1, label: t('worker:personalityTest.likert.1') },
    { value: 2, label: t('worker:personalityTest.likert.2') },
    { value: 3, label: t('worker:personalityTest.likert.3') },
    { value: 4, label: t('worker:personalityTest.likert.4') },
    { value: 5, label: t('worker:personalityTest.likert.5') },
  ];

  const handleAnswer = (response: number) => {
    if (!currentQuestion) return;

    setAnswers({ ...answers, [currentQuestion.number]: response });

    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 400);
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
              {t('worker:personalityTest.alreadyCompleted.title')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('worker:personalityTest.alreadyCompleted.description')}
            </p>
            <Button onClick={() => navigate('/worker')}>
              {t('worker:personalityTest.alreadyCompleted.backToDashboard')}
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
              {t('worker:personalityTest.intro.title')}
            </h1>
            <div className="space-y-4 text-gray-600 mb-8">
              <p>{t('worker:personalityTest.intro.p1')}</p>
              <p>{t('worker:personalityTest.intro.p2')}</p>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex gap-2">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">{t('worker:personalityTest.intro.infoTitle')}</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>{t('worker:personalityTest.intro.detail1')}</li>
                      <li>{t('worker:personalityTest.intro.detail2')}</li>
                      <li>{t('worker:personalityTest.intro.detail3')}</li>
                      <li>{t('worker:personalityTest.intro.detail4')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowIntro(false)} size="lg" className="w-full">
              {t('worker:personalityTest.intro.startButton')}
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
            {t('worker:personalityTest.progress.questionOf', {
              current: currentIndex + 1,
              total: questions.length,
            })}
          </span>
          <span className="text-sm text-gray-500">
            {t('worker:personalityTest.progress.percentCompleted', {
              percent: Math.round(progress),
            })}
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
            {likertOptions.map((option) => {
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
          {t('worker:personalityTest.back')}
        </Button>

        <div className="text-sm text-gray-500">
          {allAnswered
            ? t('worker:personalityTest.progress.allAnswered')
            : t('worker:personalityTest.progress.remaining', {
                count: questions.length - Object.keys(answers).length,
              })}
        </div>

        {isLastQuestion && allAnswered && (
          <Button onClick={handleSubmit} loading={submitting}>
            {t('worker:personalityTest.submit')}
            <CheckCircle className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
