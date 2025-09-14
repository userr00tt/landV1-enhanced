import React, { useState } from 'react';
import { Star, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useTelegram } from '../hooks/useTelegram';
import { paymentService } from '../services/api';

interface PricingSheetProps {
  children: React.ReactNode;
}

const pricingPlans = [
  {
    stars: 100,
    tokens: 5000,
    description: 'Perfect for casual users',
    features: ['5,000 extra tokens', 'Priority support', 'No ads']
  },
  {
    stars: 250,
    tokens: 15000,
    description: 'Great for regular users',
    features: ['15,000 extra tokens', 'Priority support', 'No ads', 'Advanced features'],
    popular: true
  },
  {
    stars: 500,
    tokens: 35000,
    description: 'Best value for power users',
    features: ['35,000 extra tokens', 'Priority support', 'No ads', 'Advanced features', 'Early access']
  }
];

export const PricingSheet = ({ children }: PricingSheetProps) => {
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const { openInvoice, showAlert } = useTelegram();

  const handlePurchase = async (stars: number, tokens: number) => {
    setIsLoading(stars);
    try {
      const response = await paymentService.createInvoice(
        stars,
        `${tokens.toLocaleString()} AI Chat Tokens`
      );
      
      openInvoice(response.invoiceUrl, (status) => {
        if (status === 'paid') {
          showAlert('Payment successful! Your tokens have been added to your account.');
        } else if (status === 'cancelled') {
          showAlert('Payment was cancelled.');
        } else if (status === 'failed') {
          showAlert('Payment failed. Please try again.');
        }
      });
    } catch (error) {
      showAlert('Failed to create payment. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Upgrade Your Plan
          </SheetTitle>
          <SheetDescription>
            Get more tokens to continue chatting with AI. Pay with Telegram Stars.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          {pricingPlans.map((plan) => (
            <div
              key={plan.stars}
              className={`relative p-4 border rounded-lg ${
                plan.popular ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-4 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-lg">{plan.stars} Stars</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="w-3 h-3" />
                    <span>{plan.tokens.toLocaleString()} tokens</span>
                  </div>
                </div>
                <Button
                  onClick={() => handlePurchase(plan.stars, plan.tokens)}
                  disabled={isLoading !== null}
                  className="min-w-[80px]"
                >
                  {isLoading === plan.stars ? 'Loading...' : 'Buy'}
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
              
              <ul className="space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Payments are processed securely through Telegram Stars. 
            Tokens are added to your account immediately after payment.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
