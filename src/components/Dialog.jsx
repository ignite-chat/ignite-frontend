import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';

const MyDialog = ({
  isOpen,
  setIsOpen,
  children,
  outsideChildren = '',
  title = '',
  closeOnOutsideClick = true,
  transparent = false,
  noPadding = false,
  className = '',
}) => {
  const handleOutsideClick = () => {
    if (closeOnOutsideClick) {
      setIsOpen(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleOutsideClick}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className={`w-full max-w-xl transform rounded-lg text-left align-middle transition-all ${transparent ? '' : 'bg-gray-900 shadow-xl'} ${className} `}
              >
                {title && (
                  <div className="border-b border-white/5 px-6 py-4">
                    <h2 className="text-lg font-medium text-white">{title}</h2>
                  </div>
                )}
                <div className={noPadding ? '' : 'px-6 py-4'}>{children}</div>
                {outsideChildren}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MyDialog;
