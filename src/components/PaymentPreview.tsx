import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PaymentPreviewProps {
  file: File | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PaymentPreview = ({ file, onConfirm, onCancel }: PaymentPreviewProps) => {
  const [cost, setCost] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (file) {
      const fileSizeInGB = file.size / (1024 * 1024 * 1024);
      const price = fileSizeInGB * 0.0001 * 12; // 0.0001 ETH per GB for 12 months
      const priceToUse = price >= 0.00001 ? price : 0.00001;
      setCost(priceToUse.toFixed(8));
    }
  }, [file]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      onConfirm();
    } catch (error) {
      toast.error('Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Payment Preview</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-gray-600">File Name:</p>
            <p className="font-medium">{file.name}</p>
          </div>
          
          <div>
            <p className="text-gray-600">File Size:</p>
            <p className="font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          
          <div>
            <p className="text-gray-600">Storage Duration:</p>
            <p className="font-medium">12 months</p>
          </div>
          
          <div>
            <p className="text-gray-600">Total Cost:</p>
            <p className="font-medium text-lg">{cost} ETH</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}; 