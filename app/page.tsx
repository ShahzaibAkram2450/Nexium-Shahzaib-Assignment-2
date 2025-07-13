'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Link, FileText, Brain, Languages, Database, CheckCircle, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const urlSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

type FormData = z.infer<typeof urlSchema>;

interface ProcessedBlog {
  url: string;
  title: string;
  content: string;
  summary: string;
  urduSummary: string;
  wordCount: number;
  readTime: number;
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedBlog | null>(null);
  const [error, setError] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);

  const form = useForm<FormData>({
    resolver: zodResolver(urlSchema),
  });

  const steps = [
    { icon: Link, label: 'Input Blog URL', description: 'Enter the blog URL to process' },
    { icon: FileText, label: 'Scrape Text', description: 'Extract content from the webpage' },
    { icon: Brain, label: 'AI Summary', description: 'Generate intelligent summary' },
    { icon: Languages, label: 'Translate to Urdu', description: 'Convert summary to Urdu' },
    { icon: Database, label: 'Save Summary (Supabase)', description: 'Store summary in database' },
    { icon: Database, label: 'Save Full Text (MongoDB)', description: 'Store complete content' },
  ];

  const onSubmit = async (data: FormData) => {
    setIsProcessing(true);
    setError('');
    setResult(null);
    setCurrentStep(0);

    try {
      // Step progression with delays
      for (let i = 1; i <= steps.length; i++) {
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const response = await fetch('/api/process-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to process blog');
      }

      const processedData = await response.json();
      setResult(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold">Blog Summariser</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Main Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Summarise Blog</h1>
        </div>

        {/* Input Section */}
        <div className="mb-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="Enter Blog URL"
                {...form.register('url')}
                className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                disabled={isProcessing}
              />
              {form.formState.errors.url && (
                <p className="text-sm text-red-400">{form.formState.errors.url.message}</p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Summarise'
              )}
            </Button>
          </form>
        </div>

        {/* Process Steps - Only show when processing */}
        {isProcessing && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Process</h2>
            <div className="space-y-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > index + 1;
                const isActive = currentStep === index + 1;
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-green-600 text-white' : 
                        isActive ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <StepIcon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{step.label}</div>
                      <div className="text-sm text-gray-400">{step.description}</div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-px h-8 bg-gray-700 ml-4"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mb-8 border-red-800 bg-red-900/20">
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Summary Results</h2>
            
            {/* English Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">English Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed mb-4">{result.summary}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                    {result.wordCount} words
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                    {result.readTime} min read
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Urdu Translation */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Urdu Translation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed text-right" dir="rtl">
                  {result.urduSummary}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}