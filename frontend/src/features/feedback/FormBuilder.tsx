import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useCreateFeedbackForm } from '../../hooks/useFeedback';
import { Button, Card, Input, Spinner } from '../../components/common/UI';
import { Plus, Trash2, Save, Layers, HelpCircle } from 'lucide-react';
import type { FeedbackForm } from '../../types/feedback';

const FormBuilder: React.FC = () => {
  const { register, control, handleSubmit, formState: { errors } } = useForm<FeedbackForm>({
    defaultValues: {
      formName: '',
      anonymousAllowed: true,
      sections: [{ title: '', orderNo: 1, questions: [{ questionText: '', questionOrder: 1, weight: 1, isRequired: true }] }]
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: "sections"
  });

  const createFormMutation = useCreateFeedbackForm();

  const onSubmit = (data: FeedbackForm) => {
    // Standardize orders before submission
    const formattedData = {
      ...data,
      status: 'DRAFT',
      sections: data.sections.map((section, sIdx) => ({
        ...section,
        orderNo: sIdx + 1,
        questions: section.questions.map((q, qIdx) => ({
          ...q,
          questionOrder: qIdx + 1
        }))
      }))
    };
    createFormMutation.mutate(formattedData);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white/50 p-6 rounded-2xl backdrop-blur-md border border-white shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Feedback Form Builder
          </h1>
          <p className="text-gray-500 font-medium">Design professional 360-degree feedback templates</p>
        </div>
        <Button 
          onClick={handleSubmit(onSubmit)} 
          disabled={createFormMutation.isPending}
          className="gap-2 px-6"
        >
          {createFormMutation.isPending ? <Spinner /> : <Save className="w-4 h-4" />}
          {createFormMutation.isPending ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      <Card className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Form Name"
            placeholder="e.g., Annual Leadership Review"
            {...register('formName', { required: 'Form name is required' })}
            error={errors.formName?.message}
          />
          <div className="flex items-center space-x-3 pt-8">
            <input
              type="checkbox"
              id="anonymousAllowed"
              {...register('anonymousAllowed')}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="anonymousAllowed" className="text-sm font-semibold text-gray-700">
              Allow Anonymous Responses
            </label>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {sectionFields.map((section, index) => (
          <SectionItem
            key={section.id}
            index={index}
            register={register}
            control={control}
            remove={() => removeSection(index)}
            errors={errors.sections?.[index]}
          />
        ))}

        <Button
          type="button"
          variant="secondary"
          className="w-full border-dashed py-6 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all gap-2"
          onClick={() => appendSection({ title: '', orderNo: sectionFields.length + 1, questions: [] })}
        >
          <Plus className="w-4 h-4" />
          Add New Section
        </Button>
      </div>
    </div>
  );
};

const SectionItem = ({ index, register, control, remove, errors }: any) => {
  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: `sections.${index}.questions` as const
  });

  return (
    <Card className="p-6 space-y-6 border-l-4 border-l-blue-500 overflow-visible relative group">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3 flex-1 mr-4">
          <Layers className="text-blue-500 w-5 h-5 flex-shrink-0" />
          <Input
            placeholder="Section Title (e.g., Core Competencies)"
            className="text-lg font-bold border-none bg-transparent focus:ring-0 p-0"
            {...register(`sections.${index}.title` as const, { required: 'Section title is required' })}
            error={errors?.title?.message}
          />
        </div>
        <button 
          onClick={remove}
          className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 pl-4 border-l border-gray-100 ml-2">
        {questionFields.map((field, qIndex) => (
          <div key={field.id} className="flex items-start space-x-4 animate-in slide-in-from-left-2 duration-300">
            <div className="pt-2">
              <HelpCircle className="w-4 h-4 text-gray-300" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter question text..."
                  className="flex-1"
                  {...register(`sections.${index}.questions.${qIndex}.questionText` as const, { required: true })}
                />
                <div className="w-24">
                  <Input
                    type="number"
                    placeholder="Weight"
                    {...register(`sections.${index}.questions.${qIndex}.weight` as const, { valueAsNumber: true })}
                  />
                </div>
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-4 px-2">
                <label className="flex items-center text-xs font-medium text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2"
                    {...register(`sections.${index}.questions.${qIndex}.isRequired` as const)}
                  />
                  Required Field
                </label>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-blue-600 font-semibold hover:bg-blue-50 gap-2"
          onClick={() => appendQuestion({ questionText: '', questionOrder: questionFields.length + 1, weight: 1, isRequired: true })}
        >
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>
    </Card>
  );
};

export default FormBuilder;
