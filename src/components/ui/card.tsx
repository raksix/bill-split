import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 ${className}`}>
      {title && (
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
