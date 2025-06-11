// File: src/utils/reviewStorage.ts
export interface StoredReview {
  id: string;
  taskId: number;
  taskTitle: string;
  taskDescription: string;
  fileName: string;
  fileType: string;
  ipfsHash: string;
  review: any; // The actual review data from AI
  timestamp: number;
  status: 'accepted' | 'rejected';
}

const REVIEWS_STORAGE_KEY = 'ai_reviews';

export const reviewStorage = {
  // Get all stored reviews
  getAllReviews(): StoredReview[] {
    try {
      const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting reviews from localStorage:', error);
      return [];
    }
  },

  // Add a new review
  addReview(review: Omit<StoredReview, 'id' | 'timestamp'>): StoredReview {
    try {
      const reviews = this.getAllReviews();
      const newReview: StoredReview = {
        ...review,
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      
      reviews.unshift(newReview); // Add to beginning of array (most recent first)
      
      // Keep only the last 50 reviews to prevent localStorage from getting too large
      const trimmedReviews = reviews.slice(0, 50);
      
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(trimmedReviews));
      return newReview;
    } catch (error) {
      console.error('Error saving review to localStorage:', error);
      throw new Error('Failed to save review');
    }
  },

  // Get reviews for a specific task
  getReviewsForTask(taskId: number): StoredReview[] {
    return this.getAllReviews().filter(review => review.taskId === taskId);
  },

  // Delete a review by ID
  deleteReview(reviewId: string): boolean {
    try {
      const reviews = this.getAllReviews();
      const filteredReviews = reviews.filter(review => review.id !== reviewId);
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filteredReviews));
      return true;
    } catch (error) {
      console.error('Error deleting review:', error);
      return false;
    }
  },

  // Clear all reviews
  clearAllReviews(): boolean {
    try {
      localStorage.removeItem(REVIEWS_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing reviews:', error);
      return false;
    }
  },

  // Get review by ID
  getReviewById(reviewId: string): StoredReview | null {
    const reviews = this.getAllReviews();
    return reviews.find(review => review.id === reviewId) || null;
  }
};
