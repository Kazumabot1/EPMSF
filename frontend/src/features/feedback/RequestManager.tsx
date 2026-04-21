import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFeedbackForms, useEmployees, useCycles, useCreateFeedbackRequest } from '../../hooks/useFeedback';
import { Button, Card, Input, Spinner } from '../../components/common/UI';
import { Users, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import type { FeedbackRequest } from '../../types/feedback';

const RequestManager: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const { data: forms } = useFeedbackForms();
  const { data: employees } = useEmployees();
  const { data: cycles } = useCycles();
  const createRequestMutation = useCreateFeedbackRequest();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<FeedbackRequest>>({
    defaultValues: {
      isAnonymousEnabled: true,
      status: 'ACTIVE'
    }
  });

  const onSubmit = (data: Partial<FeedbackRequest>) => {
    createRequestMutation.mutate(data, {
      onSuccess: () => {
        setShowCreate(false);
        reset();
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white/50 p-6 rounded-2xl backdrop-blur-md border border-white shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Feedback Request Management
          </h1>
          <p className="text-gray-500 font-medium">Initiate and oversee 360-degree evaluation cycles</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Feedback Request
        </Button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="text-blue-500" /> Initiate Feedback Cycle
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Target Employee</label>
                <select 
                  {...register('targetEmployeeId', { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select Employee...</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Appraisal Cycle</label>
                <select 
                  {...register('cycleId', { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select Cycle...</option>
                  {cycles?.map((cycle: any) => (
                    <option key={cycle.id} value={cycle.id}>{cycle.cycleName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Feedback Form</label>
                <select 
                  {...register('formId', { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select Template...</option>
                  {forms?.map((form: any) => (
                    <option key={form.id} value={form.id}>{form.formName}</option>
                  ))}
                </select>
              </div>

              <Input 
                label="Due Date" 
                type="date" 
                {...register('dueAt', { required: true })}
                error={errors.dueAt && 'Due date is required'}
              />

              <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <ShieldCheck className="text-blue-600 w-5 h-5" />
                <div className="flex-1">
                  <label className="text-sm font-bold text-blue-900 leading-none">Anonymity Mode</label>
                  <p className="text-xs text-blue-600 mt-1">Evaluator identities will be masked from target.</p>
                </div>
                <input
                  type="checkbox"
                  {...register('isAnonymousEnabled')}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createRequestMutation.isPending}>
                  {createRequestMutation.isPending ? <Spinner className="mr-2" /> : null}
                  {createRequestMutation.isPending ? 'Initiating...' : 'Start Cycle'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-none shadow-lg">
          <div>
            <p className="text-blue-100 font-medium">Active Requests</p>
            <h3 className="text-3xl font-bold mt-1">12</h3>
          </div>
          <Users className="w-10 h-10 opacity-20" />
        </Card>
        <Card className="p-6 flex items-center justify-between border-l-4 border-l-teal-500">
          <div>
            <p className="text-gray-500 font-medium">Completion Rate</p>
            <h3 className="text-3xl font-bold mt-1 text-gray-900">74%</h3>
          </div>
          <ShieldCheck className="w-10 h-10 text-teal-100" />
        </Card>
        <Card className="p-6 flex items-center justify-between border-l-4 border-l-orange-500">
          <div>
            <p className="text-gray-500 font-medium">Pending Reviews</p>
            <h3 className="text-3xl font-bold mt-1 text-gray-900">48</h3>
          </div>
          <AlertCircle className="w-10 h-10 text-orange-100" />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Recent Requests</h2>
          <Button variant="ghost" className="text-xs">View All</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Target Employee</th>
                <th className="px-6 py-4">Appraisal Cycle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">JD</div>
                    <span className="font-semibold text-gray-900">Jane Doe</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">Annual Review 2024</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">ACTIVE</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">2024-12-31</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" className="text-blue-600 underline">Details</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RequestManager;
