import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAssignments, useFormDetails, useSubmitFeedbackResponse } from '../../hooks/useFeedback';
import { Button, Card, Spinner } from '../../components/common/UI';
import { CheckCircle2, ChevronRight, ClipboardList, PenLine, Star, AlertTriangle } from 'lucide-react';

const FeedbackSubmission: React.FC = () => {
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(1); // Hardcoded evaluator ID 1
  const { data: form, isLoading: loadingForm } = useFormDetails(selectedAssignment?.formId);

  const submitMutation = useSubmitFeedbackResponse();

  const handleSelect = (assignment: any) => {
    setSelectedAssignment(assignment);
  };

  if (submitMutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Evaluation Submitted!</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Thank you for providing your valuable feedback. Your input helps drive professional development and growth.
        </p>
        <Button onClick={() => { setSelectedAssignment(null); submitMutation.reset(); }} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white/50 p-6 rounded-2xl backdrop-blur-md border border-white shadow-sm">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Feedback Submission Portal
        </h1>
        <p className="text-gray-500 font-medium">Provide constructive evaluations for your colleagues</p>
      </div>

      {!selectedAssignment ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingAssignments ? (
            <div className="col-span-full py-20 flex justify-center"><Spinner className="w-10 h-10 text-blue-600" /></div>
          ) : assignments?.length === 0 ? (
            <Card className="col-span-full p-12 text-center text-gray-500">
              <ClipboardList className="mx-auto w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg">No pending evaluations assigned to you.</p>
            </Card>
          ) : (
            assignments?.map((assignment: any) => (
              <Card key={assignment.id} className="p-6 hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer group" onClick={() => handleSelect(assignment)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {assignment.targetEmployeeName?.[0] || 'U'}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-100 text-orange-600 tracking-wider uppercase">
                    {assignment.sourceType}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{assignment.targetEmployeeName}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{assignment.formTitle}</p>
                <div className="mt-6 flex items-center justify-between text-xs font-semibold">
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Due {assignment.dueAt}
                  </span>
                  <span className="text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                    Start Evaluation <ChevronRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <EvaluationForm 
          form={form} 
          loading={loadingForm} 
          assignmentId={selectedAssignment.id}
          onSubmit={(data: any) => submitMutation.mutate(data)}
          onCancel={() => setSelectedAssignment(null)}
          isPending={submitMutation.isPending}
        />
      )}
    </div>
  );
};

const EvaluationForm = ({ form, loading, assignmentId, onSubmit, onCancel, isPending }: any) => {
  const { register, handleSubmit } = useForm();
  
  if (loading) return <div className="py-20 flex justify-center"><Spinner className="w-10 h-10 text-blue-600" /></div>;

  const submitHandler = (data: Record<string, any>) => {
    const responses = Object.entries(data)
      .filter(([key]) => key.startsWith('q_'))
      .map(([key, value]) => ({
        questionId: parseInt(key.replace('q_', '')),
        ratingValue: value,
        comment: (data as any)[`c_${key.replace('q_', '')}`] || ''
      }));

    onSubmit({
      evaluatorAssignmentId: assignmentId,
      responses,
      comments: data.overallComments
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <Card className="p-8 border-t-8 border-t-blue-600 shadow-xl">
        <h2 className="text-3xl font-black text-gray-900 mb-2">{form?.formName}</h2>
        <p className="text-gray-500 font-medium">Please provide your honest evaluation. Completion is mandatory for all required fields.</p>
      </Card>

      <form onSubmit={handleSubmit(submitHandler)} className="space-y-10">
        {form?.sections.map((section: any) => (
          <div key={section.id} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{section.title}</h3>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {section.questions.map((question: any) => (
              <Card key={question.id} className="p-8 transition-all hover:border-blue-200">
                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-lg font-bold text-gray-800 leading-tight flex-1">
                      {question.questionText}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    <Star className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <label key={val} className="flex-1 min-w-[60px]">
                        <input
                          type="radio"
                          value={val}
                          {...register(`q_${question.id}`, { required: question.isRequired })}
                          className="peer sr-only"
                        />
                        <div className="h-12 flex items-center justify-center border-2 border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-600 font-bold transition-all">
                          {val}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="relative">
                    <PenLine className="absolute left-3 top-3 w-4 h-4 text-gray-300" />
                    <textarea
                      placeholder="Add specific examples or context..."
                      rows={2}
                      {...register(`c_${question.id}`)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

        <Card className="p-8 space-y-4 bg-gray-900 border-none shadow-2xl">
          <label className="text-blue-400 font-bold text-sm tracking-widest uppercase">Overall Summary & Final Comments</label>
          <textarea
            placeholder="Summarize your overall feedback..."
            rows={4}
            {...register('overallComments')}
            className="w-full p-4 bg-white/10 border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
          />
        </Card>

        <div className="flex justify-end gap-3 pb-20">
          <Button variant="secondary" type="button" onClick={onCancel} className="px-10 py-3">Back</Button>
          <Button type="submit" disabled={isPending} className="px-10 py-3 gap-2">
            {isPending ? <Spinner /> : <CheckCircle2 className="w-5 h-5" />}
            {isPending ? 'Submitting...' : 'Complete Evaluation'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackSubmission;
