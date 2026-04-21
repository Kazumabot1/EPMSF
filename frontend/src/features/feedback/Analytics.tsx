import React from 'react';
import { useFeedbackSummary } from '../../hooks/useFeedback';
import { Card, Button, Spinner } from '../../components/common/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, FileBarChart, Download, ArrowLeft } from 'lucide-react';

const FeedbackAnalytics: React.FC = () => {
  const { data: summary, isLoading, error } = useFeedbackSummary(1); // Hardcoded Request ID 1 for analytics demo

  if (isLoading) return <div className="py-20 flex justify-center"><Spinner className="w-10 h-10 text-blue-600" /></div>;

  if (error || !summary) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 inline-block">
          <FileBarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="font-bold">No analytics data available</p>
          <p className="text-sm opacity-80">Please ensure feedback collection is active or has responses.</p>
        </div>
      </div>
    );
  }

  const completionData = [
    { name: 'Completed', value: summary.totalResponses, color: '#2563eb' },
    { name: 'Pending', value: summary.pendingEvaluators, color: '#e5e7eb' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white/50 p-6 rounded-2xl backdrop-blur-md border border-white shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Feedback Portfolio Analytics
          </h1>
          <p className="text-gray-500 font-medium">Visualizing performance insights and response metrics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2">
            <Download className="w-4 h-4" /> Export Report
          </Button>
          <Button className="gap-2">
            Share Insights
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-blue-600 text-white border-none shadow-lg">
          <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">Overall Score</p>
          <div className="flex items-end gap-2 mt-2">
            <h3 className="text-4xl font-black">{summary.averageScore.toFixed(1)}</h3>
            <span className="text-blue-200 text-sm font-medium mb-1">/ 5.0</span>
          </div>
          <p className="text-xs text-blue-200 mt-4 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 12% increase from last cycle
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Responses</p>
          <div className="flex items-end gap-2 mt-2">
            <h3 className="text-4xl font-black text-gray-900">{summary.totalResponses}</h3>
            <Users className="text-blue-500 w-8 h-8 mb-1 opacity-20 ml-auto" />
          </div>
          <p className="text-xs text-green-600 mt-4 font-bold">Quorum reached</p>
        </Card>

        <Card className="p-6">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Completion Rate</p>
          <div className="flex items-end gap-2 mt-2">
            <h3 className="text-4xl font-black text-gray-900">
              {Math.round((summary.totalResponses / (summary.totalResponses + summary.pendingEvaluators)) * 100)}%
            </h3>
            <div className="h-2 flex-1 bg-gray-100 rounded-full mb-3 ml-4 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${(summary.totalResponses / (summary.totalResponses + summary.pendingEvaluators)) * 100}%` }}
                ></div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Target: 80%</p>
        </Card>

        <Card className="p-6">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Pending Tasks</p>
          <div className="flex items-end gap-2 mt-2">
            <h3 className="text-4xl font-black text-orange-600">{summary.pendingEvaluators}</h3>
            <Clock className="text-orange-500 w-8 h-8 mb-1 opacity-20 ml-auto" />
          </div>
          <p className="text-xs text-orange-500 mt-4 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Due in 4 days
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-8 border-b pb-4">Competency Breakdown</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockCompetencyData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 5]} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 flex flex-col">
          <h3 className="text-xl font-bold text-gray-900 mb-8 border-b pb-4">Response Status</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
              {completionData.map(item => (
                <div key={item.name} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.name}</span>
                  </div>
                  <div className="text-xl font-black text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white/30 backdrop-blur-md rounded-2xl p-8 border border-white flex flex-col items-center text-center space-y-4">
        <ArrowLeft className="w-6 h-6 text-gray-400 mb-2 cursor-pointer hover:-translate-x-1 transition-transform" />
        <h4 className="text-xl font-bold text-gray-900">Return to Individual Reports</h4>
        <p className="text-gray-500 max-w-sm">Detailed qualitative analysis and evaluator comments are available in the employee view.</p>
        <Button variant="ghost" className="text-blue-600 font-bold">Go to Individual View</Button>
      </div>
    </div>
  );
};

const mockCompetencyData = [
  { name: 'Leadership', score: 4.2 },
  { name: 'Tech Skills', score: 4.8 },
  { name: 'Communcation', score: 3.9 },
  { name: 'Reliability', score: 4.5 },
  { name: 'Teamwork', score: 4.7 },
];

export default FeedbackAnalytics;
