'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Landmark, WalletCards } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DepositView } from './DepositView';
import { PaymentView } from './PaymentView';
import { TransferView } from './TransferView';

type MobileTab = 'deposit' | 'pay' | 'transfer';

const TAB_ITEMS: Array<{
  key: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'deposit', label: 'Deposit', icon: WalletCards },
  { key: 'pay', label: 'Pay', icon: Landmark },
  { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
];

export function MobileAppShell() {
  const [activeTab, setActiveTab] = useState<MobileTab>('deposit');
  const [previousTab, setPreviousTab] = useState<MobileTab>('deposit');

  const activeIndex = TAB_ITEMS.findIndex((item) => item.key === activeTab);
  const previousIndex = TAB_ITEMS.findIndex((item) => item.key === previousTab);
  const direction = activeIndex >= previousIndex ? 1 : -1;

  const activeView = useMemo(() => {
    if (activeTab === 'pay') {
      return <PaymentView />;
    }
    if (activeTab === 'transfer') {
      return <TransferView />;
    }
    return <DepositView />;
  }, [activeTab]);

  return (
    <div className="relative h-[100dvh]">
      <div className="h-full overflow-y-auto overscroll-contain pb-24 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ x: direction > 0 ? 42 : -42, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -42 : 42, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {activeView}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="absolute inset-x-0 bottom-0 border-t border-border bg-white/95 px-4 pb-5 pt-2 backdrop-blur">
        <ul className="grid grid-cols-3 gap-2">
          {TAB_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeTab;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviousTab(activeTab);
                    setActiveTab(key);
                  }}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
                    isActive
                      ? 'bg-brand-bg text-brand-amber'
                      : 'text-text-secondary hover:bg-subtle'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
