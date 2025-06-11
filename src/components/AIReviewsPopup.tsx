'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import { Button } from "@/components/ui/button";
import { reviewStorage, StoredReview } from '@/utils/reviewStorage';
import { Trash2, Eye, Calendar, FileText, Check, X, Filter } from 'lucide-react';

interface AIReviewsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReview: (review: any) => void;
}

export default function AIReviewsPopup({ isOpen, onClose, onViewReview }: AIReviewsPopupProps) {
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<StoredReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadReviews();
    }
  }, [isOpen]);

  useEffect(() => {
    filterReviews();
  }, [reviews, statusFilter, searchTerm]);

  const loadReviews = () => {
    const storedReviews = reviewStorage.getAllReviews();
    setReviews(storedReviews);
  };

  const filterReviews = () => {
    let filtered = reviews;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(review => review.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(review =>
        review.taskTitle.toLowerCase().includes(searchLower) ||
        review.fileName.toLowerCase().includes(searchLower) ||
        review.taskDescription.toLowerCase().includes(searchLower)
      );
    }

    setFilteredReviews(filtered);
  };

  const handleDeleteReview = (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      reviewStorage.deleteReview(reviewId);
      loadReviews();
    }
  };

  const handleClearAllReviews = () => {
    if (window.confirm('Are you sure you want to delete all reviews? This action cannot be undone.')) {
      reviewStorage.clearAllReviews();
      setReviews([]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    return status === 'accepted' ? (
      <Check className="w-4 h-4 text-green-400" />
    ) : (
      <X className="w-4 h-4 text-red-400" />
    );
  };

  const getStatusColor = (status: string) => {
    return status === 'accepted' 
      ? 'bg-green-500/20 text-green-400 border-green-500/20' 
      : 'bg-red-500/20 text-red-400 border-red-500/20';
  };

  const popupVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -50 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
    exit: { opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[75] flex items-center justify-center p-4"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className="bg-black/80 border border-white/20 rounded-3xl p-8 max-w-6xl w-full h-[90vh] text-white/90 relative shadow-2xl flex flex-col"
          variants={popupVariants}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-light text-white/95">AI Review History</h2>
            <button
              onClick={onClose}
              className="bg-white/15 backdrop-blur-md text-white/90 hover:bg-white/25 text-lg px-4 py-2 border border-white/40 rounded-full font-light transition-colors duration-200"
            >
              Close
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/60" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'accepted' | 'rejected')}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="all" className="bg-black text-white">All Reviews</option>
                <option value="accepted" className="bg-black text-white">Accepted</option>
                <option value="rejected" className="bg-black text-white">Rejected</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search by task title or file name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white/90 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
            />

            {reviews.length > 0 && (
              <Button
                onClick={handleClearAllReviews}
                variant="outline"
                className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Reviews List */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {filteredReviews.length === 0 ? (
              <div className="text-center text-white/70 min-h-[200px] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-lg mb-2">
                    {reviews.length === 0 
                      ? 'No AI reviews yet' 
                      : 'No reviews match your filters'
                    }
                  </p>
                  <p className="text-sm text-white/50">
                    {reviews.length === 0
                      ? 'Submit a task for AI review to see it here'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <GlassCard key={review.id} className="p-6 border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-medium text-white/95">{review.taskTitle}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(review.status)}`}>
                            {getStatusIcon(review.status)}
                            {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm mb-2">Task #{review.taskId}</p>
                        <p className="text-white/60 text-sm line-clamp-2 mb-3">{review.taskDescription}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-white/60 text-sm">File Name:</p>
                        <p className="text-white/90 font-medium">{review.fileName}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">File Type:</p>
                        <p className="text-white/90 font-medium">{review.fileType}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">Review Date:</p>
                        <p className="text-white/90 font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(review.timestamp)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">IPFS Hash:</p>
                        <p className="text-white/90 font-mono text-xs break-all">{review.ipfsHash}</p>
                      </div>
                    </div>

                    {/* Review Summary */}
                    {review.review && (
                      <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-white/95 font-medium mb-2">Review Summary</h4>
                        <p className="text-white/80 text-sm line-clamp-3">
                          {review.review.overallAssessment?.feedback || 
                           review.review.feedback || 
                           'No summary available'}
                        </p>
                        {review.review.codeQuality?.score && (
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-white/60">Quality Score:</span>
                            <span className="text-white/90 font-medium">
                              {review.review.codeQuality.score}/10
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => onViewReview(review.review)}
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white/90 hover:bg-white/20 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Review
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteReview(review.id)}
                        variant="outline"
                        className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          {/* Stats Footer */}
          {reviews.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-sm text-white/70">
                <div className="flex items-center gap-6">
                  <span>Total Reviews: {reviews.length}</span>
                  <span className="text-green-400">
                    Accepted: {reviews.filter(r => r.status === 'accepted').length}
                  </span>
                  <span className="text-red-400">
                    Rejected: {reviews.filter(r => r.status === 'rejected').length}
                  </span>
                </div>
                <span>Showing {filteredReviews.length} of {reviews.length}</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
