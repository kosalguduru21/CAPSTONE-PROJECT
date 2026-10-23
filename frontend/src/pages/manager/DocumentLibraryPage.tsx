import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../api/client';
import { DocumentRecord } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

export const DocumentLibraryPage: React.FC = () => {
  const { addToast } = useNotifications();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('policy');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const data = await api.get('/api/documents');
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !title.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation',
        message: 'Please provide a document title and select a PDF or TXT file.',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('title', title.trim());
      formData.append('documentType', documentType);

      await api.upload('/api/documents', formData);

      addToast({
        type: 'success',
        title: 'Ingestion Started',
        message: 'Document uploaded. Extracting text and embedding chunks with Ollama...',
      });

      setTitle('');
      setUploadFile(null);
      await fetchDocuments();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Unable to upload document.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document and remove its chunks from the vector index?')) {
      return;
    }

    try {
      await api.delete(`/api/documents/${docId}`);
      addToast({
        type: 'success',
        title: 'Document Removed',
        message: 'Document and all vector embeddings have been deleted.',
      });
      await fetchDocuments();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Unable to delete document.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Atlas Vector Search & RAG
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
              Model: qwen3-embedding:4b (2560 dims)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Document & Policy Ingestion Library</h2>
          <p className="text-xs text-slate-300 mt-1">
            Manage apartment bylaws, tenant responsibilities, and equipment manuals for AI grounded retrieval.
          </p>
        </div>

        <Button
          onClick={fetchDocuments}
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4 text-purple-400" />}
        >
          Refresh Index
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Document Form */}
        <Card className="p-6 h-fit space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Upload New Source Document</span>
          </h3>
          <p className="text-xs text-slate-400">
            Accepts text-based PDF or TXT files. The pipeline extracts text, generates chunk embeddings, and registers vector records.
          </p>

          <form onSubmit={handleUpload} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Document Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2026 Grand Heights Maintenance Policy"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Document Category</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="policy">Apartment Maintenance Policy</option>
                <option value="equipment_manual">Equipment / Appliance Manual</option>
                <option value="operating_guideline">Vendor Operating Procedure</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">File (.pdf or .txt)</label>
              <input
                type="file"
                required
                accept=".pdf,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              className="w-full mt-2"
              icon={<Upload className="w-4 h-4" />}
            >
              Upload & Vectorize
            </Button>
          </form>
        </Card>

        {/* Existing Indexed Documents List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Vectorized Document Collection ({documents.length})
            </h3>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading document catalog..." />
          ) : documents.length === 0 ? (
            <EmptyState
              title="No Documents Uploaded"
              description="Upload your first maintenance policy or equipment manual to power document-grounded AI answering."
              icon={FolderOpen}
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card
                  key={doc._id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {doc.documentType}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          doc.processingStatus === 'Ready'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : doc.processingStatus === 'Failed'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                        }`}
                      >
                        {doc.processingStatus}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{doc.title}</h4>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Source: {doc.originalFilename}</span>
                      <span>•</span>
                      <span className="text-purple-300 font-medium">{doc.chunkCount || 0} chunks embedded</span>
                      <span>•</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete document and invalidate vector chunks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
