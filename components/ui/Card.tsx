import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
    const combinedClasses = `bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-sm p-4 transition-shadow hover:shadow-md ${className}`;
    
    return (
        <div className={combinedClasses} {...props}>
            {children}
        </div>
    );
};
