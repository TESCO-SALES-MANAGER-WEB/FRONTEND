import React, { useState } from 'react';
import { 
  Briefcase,
  TrendingDown,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  DollarSign
} from 'lucide-react';
import './NegotiationCenter.css';

const NegotiationCenter = () => {
  const negotiations = [
    { 
      id: 'NEG-041', 
      client: 'Sarah Jenkins', 
      initialQuote: 45000, 
      clientOffer: 42000, 
      status: 'Active', 
      lastMessage: 'Client is asking if we can include premium fixtures at this price.',
      probability: 85
    },
    { 
      id: 'NEG-042', 
      client: 'David Thompson', 
      initialQuote: 32000, 
      clientOffer: 28000, 
      status: 'Stalled', 
      lastMessage: 'Too far apart on budget. Following up next week.',
      probability: 30
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getDiscountPercentage = (initial, offer) => {
    return (((initial - offer) / initial) * 100).toFixed(1);
  };

  return (
    <div className="negotiation-center">
      <div className="page-header">
        <div>
          <h2>Negotiation Center</h2>
          <p>Track and manage high-value deals in active negotiation</p>
        </div>
      </div>

      <div className="negotiation-list">
        {negotiations.map(deal => (
          <div key={deal.id} className="deal-card">
            <div className="deal-header">
              <div className="deal-info">
                <h3>{deal.client}</h3>
                <span className="deal-id">{deal.id}</span>
              </div>
              <div className={`probability-badge ${deal.probability > 70 ? 'high' : 'low'}`}>
                {deal.probability}% Win Probability
              </div>
            </div>

            <div className="deal-financials">
              <div className="financial-block">
                <span className="label">Initial Quote</span>
                <span className="value">{formatCurrency(deal.initialQuote)}</span>
              </div>
              <div className="financial-connector">
                <TrendingDown size={18} className="text-warning" />
                <span className="discount-tag">-{getDiscountPercentage(deal.initialQuote, deal.clientOffer)}%</span>
              </div>
              <div className="financial-block">
                <span className="label">Client Offer</span>
                <span className="value highlight">{formatCurrency(deal.clientOffer)}</span>
              </div>
              <div className="financial-block right">
                <span className="label">Gap</span>
                <span className="value gap">{formatCurrency(deal.initialQuote - deal.clientOffer)}</span>
              </div>
            </div>

            <div className="deal-footer">
              <div className="last-message">
                <MessageCircle size={16} />
                <p>"{deal.lastMessage}"</p>
              </div>
              <div className="action-buttons">
                <button className="btn-secondary decline">
                  <ThumbsDown size={14} /> Decline
                </button>
                <button className="btn-primary counter">
                  <DollarSign size={14} /> Counter Offer
                </button>
                <button className="btn-primary accept">
                  <ThumbsUp size={14} /> Accept Offer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NegotiationCenter;
