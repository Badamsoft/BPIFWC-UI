import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Key } from 'lucide-react';
import { t } from '../utils/i18n';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  onActivated,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Key className="w-5 h-5 text-[#d20c0b]" />
            {t('License Management')}
          </DialogTitle>
          <DialogDescription>
            {t('Commercial license management is handled outside the main importer interface.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('Use the separate add-on page in WordPress admin to review or manage commercial license status.')}
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('The free plugin keeps commercial licensing separate from the main importer interface.')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('Cancel')}
          </button>
          <button
            onClick={() => {
              setAcknowledged(true);
              if (onActivated) {
                onActivated();
              }
              handleClose();
            }}
            disabled={acknowledged}
            className="px-4 py-2 text-sm font-medium text-white bg-[#d20c0b] rounded-lg hover:bg-[#b00a0a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {t('Got it')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
