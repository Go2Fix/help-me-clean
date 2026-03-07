import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';

export default function DocsPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/docs/DOCUMENTATIE.md')
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(setContent)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96 text-gray-500">
        Nu s-a putut încărca documentația.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-gray-900">Documentație Platformă</h1>
      </div>

      <div className="prose prose-gray prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h2:mt-10 prose-h3:text-base prose-a:text-primary prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:text-sm prose-table:text-sm prose-td:align-top max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
