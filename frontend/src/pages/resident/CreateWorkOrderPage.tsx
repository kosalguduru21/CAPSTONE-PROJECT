import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  Upload,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { api } from '../../api/client';
import { useNotifications } from '../../context/NotificationContext';
import { AccessWindow, PriorityLevel } from '../../types';

interface CreateWorkOrderPageProps {
  onBack: () => void;
  onSuccess: (orderId: string) => void;
}

export const CreateWorkOrderPage: React.FC<CreateWorkOrderPageProps> = ({ onBack, onSuccess }) => {
  const { addToast } = useNotifications();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('plumbing');
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [accessNotes, setAccessNotes] = useState('');
  const [isSharedArea, setIsSharedArea] = useState(false);
  const [sharedAreaDescription, setSharedAreaDescription] = useState('');
  
  // Preferred Access Windows
  const today = new Date().toISOString().split('T')[0];
  const [windows, setWindows] = useState<AccessWindow[]>([
    { date: today, timeSlot: 'Morning (8am-12pm)' },
  ]);

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddWindow = () => {
    setWindows((prev) => [...prev, { date: today, timeSlot: 'Afternoon (12pm-4pm)' }]);
  };

  const handleRemoveWindow = (index: number) => {
    setWindows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateWindow = (index: number, field: keyof AccessWindow, val: any) => {
    setWindows((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: val } : w))
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation',
        message: 'Please provide both a title and issue description.',
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('accessNotes', accessNotes);
      formData.append('preferredAccessWindows', JSON.stringify(windows));

      if (isSharedArea && sharedAreaDescription.trim()) {
        formData.append('sharedAreaDescription', sharedAreaDescription.trim());
      }

      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await api.upload('/api/work-orders', formData);

      addToast({
        type: 'success',
        title: 'Request Submitted',
        message: `Work Order ${response.workOrder?.orderNumber || ''} created successfully.`,
      });

      onSuccess(response.workOrder?._id);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Unable to submit work order.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Requests</span>
      </button>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create Maintenance Request</h2>
        <p className="text-xs text-slate-400 mt-1">
          Submit a maintenance report for your assigned unit or an authorized shared community area
        </p>
      </div>

      {priority === 'Emergency' && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-200">Active Life-Safety Emergency Notice</div>
            For immediate active floods, fires, or gas odors, call emergency dispatch (555) 911-3000 or 911 immediately.
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Location */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Issue Location
            </label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={!isSharedArea}
                  onChange={() => setIsSharedArea(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-200">My Assigned Unit (Unit 101, Grand Heights)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={isSharedArea}
                  onChange={() => setIsSharedArea(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-200">Shared / Common Area</span>
              </label>
            </div>

            {isSharedArea && (
              <input
                type="text"
                value={sharedAreaDescription}
                onChange={(e) => setSharedAreaDescription(e.target.value)}
                placeholder="e.g. 1st Floor Hallway near elevator, Laundry Room, Clubhouse"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            )}
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Trade Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="plumbing">Plumbing (Pipes, leaks, drains, faucets)</option>
                <option value="electrical">Electrical (Outlets, switches, lighting)</option>
                <option value="hvac">HVAC (Heating, AC, thermostat)</option>
                <option value="appliances">Appliances (Refrigerator, oven, dishwasher)</option>
                <option value="fixtures">Fixtures & Doors</option>
                <option value="structural">Structural (Ceilings, drywalls, floors)</option>
                <option value="cleaning">Sanitation & Grounds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Low">Low (Cosmetic, non-urgent)</option>
                <option value="Normal">Normal (Standard repair)</option>
                <option value="High">High (Impacting daily living)</option>
                <option value="Emergency">Emergency (Active hazard / rapid damage)</option>
              </select>
            </div>
          </div>

          {/* Title & Plain-Language Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject / Summary</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water leaking from kitchen ceiling below upper floor"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Problem Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, where the issue is situated, when it started, and any symptoms (e.g. discoloration, dripping rate, strange noises)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Preferred Access Windows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Preferred Technician Visit Windows
                </label>
                <p className="text-[11px] text-slate-400">Select dates and times you or your unit will be accessible</p>
              </div>
              <button
                type="button"
                onClick={handleAddWindow}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Window</span>
              </button>
            </div>

            <div className="space-y-2">
              {windows.map((win, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={win.date}
                    onChange={(e) => handleUpdateWindow(idx, 'date', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs"
                  />
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={win.timeSlot}
                    onChange={(e) => handleUpdateWindow(idx, 'timeSlot', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none text-xs flex-1"
                  >
                    <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
                    <option value="Afternoon (12pm-4pm)">Afternoon (12pm-4pm)</option>
                    <option value="Evening (4pm-8pm)">Evening (4pm-8pm)</option>
                  </select>
                  {windows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWindow(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Access Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Access Instructions & Pet Notes (Private to Assigned Staff)
            </label>
            <input
              type="text"
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder="e.g. Please ring doorbell twice, cat will be crated in bathroom, lockbox code on file"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Supporting Photographs or Documents (Optional)
            </label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
            {files.length > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                {files.length} file(s) selected: {files.map((f) => f.name).join(', ')}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onBack} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Submit Maintenance Request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
