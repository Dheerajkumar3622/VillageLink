
import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, CheckCircle, Smartphone, QrCode, Home, Radio, HandCoins, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { playSonicToken } from '../services/advancedFeatures';
import { spendGramCoin, earnGramCoin } from '../services/blockchainService';
import { getCurrentUser, getAuthToken } from '../services/authService';
import { API_BASE_URL } from '../config';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transactionId?: string) => void;
  amount: number;
  orderId: string; // Internal Order/Ticket ID
}

type PayTab = 'CARD' | 'UPI' | 'QR' | 'SONIC' | 'UDHAAR';

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen, onClose, onSuccess, amount, orderId
}) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [activeTab, setActiveTab] = useState<PayTab>('CARD');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTxnId, setCurrentTxnId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setActiveTab('CARD');
      setErrorMessage('');
      setCurrentTxnId(undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    const user = getCurrentUser();
    const token = getAuthToken();

    if (!user || !token) {
      setErrorMessage("User session not found.");
      setStep('error');
      return;
    }

    try {
      setStep('processing');

      // 0. Ensure SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Failed to load Payment Gateway. Please check internet connection.");
      }

      // 1. Create Order (Using enhanced backend route)
      const orderRes = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ orderId, amount: amount })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Order creation failed");
      }
      const data = await orderRes.json();
      const rpOrder = data.order;
      const keyId = data.keyId;

      // 2. Open Razorpay Modal
      const options = {
        key: keyId,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: "VillageLink",
        description: `Order: ${orderId}`,
        image: "https://vlink.ai/logo.png",
        order_id: rpOrder.id,
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: orderId,
                method: activeTab
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setCurrentTxnId(response.razorpay_payment_id);
              setStep('success');
              setTimeout(() => {
                onSuccess(response.razorpay_payment_id);
              }, 2000);
            } else {
              throw new Error(verifyData.error || "Signature verification failed");
            }
          } catch (e: any) {
            setErrorMessage("Payment Verification Failed: " + e.message);
            setStep('error');
          }
        },
        prefill: {
          name: user.name,
          contact: user.phone || '',
          email: user.email || ''
        },
        theme: {
          color: "#7c3aed"
        },
        modal: {
          ondismiss: function () {
            setStep('form');
          }
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        setErrorMessage(response.error.description);
        setStep('error');
      });
      rzp1.open();

    } catch (e: any) {
      setErrorMessage(e.message || "Payment Initialization Failed");
      setStep('error');
    }
  };

  const handleInternalPayment = async () => {
    // Handle Udhaar and Sonic (Simulated/Internal)
    const user = getCurrentUser();
    if (!user) return;

    try {
      setStep('processing');
      // Explicitly type result to avoid TS inference errors
      let result: { success: boolean; transactionId?: string } = { success: false };

      if (activeTab === 'UDHAAR') {
        if (amount > 500) {
          throw new Error("Credit limit exceeded");
        }
        result = await spendGramCoin(user.id, amount, "Udhaar: Ticket Booking");
      } else if (activeTab === 'SONIC') {
        playSonicToken(`PAY-${amount}-${Date.now()}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Simulate success for Sonic
        result = { success: true, transactionId: `SONIC-${Date.now()}` };
      }

      if (result.success) {
        setCurrentTxnId(result.transactionId);
        setStep('success');
        setTimeout(() => {
          onSuccess(result.transactionId);
        }, 2000);
      } else {
        throw new Error("Internal transaction failed");
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      setStep('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'UDHAAR' || activeTab === 'SONIC') {
      handleInternalPayment();
    } else {
      // For Card, UPI, QR -> Use Razorpay
      handleRazorpayPayment();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={step === 'form' ? onClose : undefined}></div>

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1 rounded-md text-white"><Lock size={12} /></div>
            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Secure Payment Gateway</span>
          </div>
          {step === 'form' && <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>}
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-6">
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">Total Payable</p>
                <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">₹{amount.toFixed(2)}</p>
              </div>

              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-hide">
                <button type="button" onClick={() => setActiveTab('CARD')} className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'CARD' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-white' : 'text-slate-500'}`}>Online</button>
                <button type="button" onClick={() => setActiveTab('UDHAAR')} className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1 justify-center ${activeTab === 'UDHAAR' ? 'bg-pink-100 text-pink-600 shadow-sm' : 'text-slate-500'}`}>Udhaar</button>
                <button type="button" onClick={() => setActiveTab('SONIC')} className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1 justify-center ${activeTab === 'SONIC' ? 'bg-brand-500 shadow-sm text-white' : 'text-slate-500'}`}><Radio size={12} /></button>
              </div>

              {activeTab === 'CARD' && (
                <div className="space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Pay Securely via Razorpay</p>
                  <p className="text-xs text-slate-500 mb-4">Supports Credit/Debit Cards, UPI (GPay, PhonePe), and Netbanking.</p>
                  <div className="flex justify-center gap-3 opacity-60">
                    <CreditCard size={24} />
                    <Smartphone size={24} />
                    <QrCode size={24} />
                  </div>
                </div>
              )}

              {activeTab === 'UDHAAR' && (<div className="animate-fade-in space-y-4"><div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl border border-pink-200 dark:border-pink-800/50 flex items-start gap-3 relative overflow-hidden"><HandCoins className="text-pink-500 mt-1 relative z-10" size={24} /><div className="relative z-10"><h4 className="text-sm font-bold text-pink-800 dark:text-pink-200 flex items-center gap-1">Udhaar Sakhi <Sparkles size={12} /></h4><p className="text-xs text-pink-700 dark:text-pink-300 mt-1">Interest-free credit.</p></div></div><div className="flex justify-between items-center text-sm px-2"><span className="text-slate-500">Limit</span><span className="font-bold text-slate-800 dark:text-white">₹500.00</span></div>{amount > 500 && (<div className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> Limit exceeded.</div>)}</div>)}

              {activeTab === 'SONIC' && (<div className="animate-fade-in flex flex-col items-center text-center p-4"><div className="w-32 h-32 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-4 relative"><Radio size={48} className="text-brand-600 dark:text-brand-400 relative z-10" /></div><h4 className="font-bold text-slate-800 dark:text-white">Sonic Payment</h4><p className="text-xs text-slate-500">Audio-based transfer.</p></div>)}

              <div className="pt-2">
                <Button type="submit" fullWidth className="py-4 shadow-xl shadow-brand-500/20" disabled={activeTab === 'UDHAAR' && amount > 500}>
                  {activeTab === 'CARD' ? `Pay ₹${amount.toFixed(2)}` : `Process ${activeTab}`}
                </Button>
              </div>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                <Lock className="absolute inset-0 m-auto text-brand-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Processing Transaction</h3>
              <p className="text-slate-500 text-sm mt-1">Please do not close this window...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="text-red-500 w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Payment Failed</h3>
              <p className="text-slate-500 text-sm mt-1 mb-8 px-4">{errorMessage}</p>
              <Button onClick={() => setStep('form')} variant="secondary" fullWidth>Try Again</Button>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle className="text-green-500 w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Payment Successful</h3>
              <p className="text-slate-500 text-sm mt-1 mb-8">Txn ID: {currentTxnId || 'Processing...'}</p>
              <Button onClick={() => onSuccess(currentTxnId)} variant="outline" className="min-w-[160px] gap-2"><Home size={16} /> Back to App</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
