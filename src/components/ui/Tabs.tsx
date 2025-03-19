import React, { createContext, useContext, useState } from 'react';

type TabsContextType = {
  selectedTab: string;
  setSelectedTab: (id: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [selectedTab, setSelectedTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ selectedTab, setSelectedTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex space-x-1 rounded-lg p-1 ${className}`}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }
  
  const { selectedTab, setSelectedTab } = context;
  const isSelected = selectedTab === value;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      onClick={() => setSelectedTab(value)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all
        ${isSelected 
          ? 'bg-white text-indigo-700 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900'
        } ${className}`}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }
  
  const { selectedTab } = context;
  
  if (selectedTab !== value) {
    return null;
  }
  
  return (
    <div
      role="tabpanel"
      data-state={selectedTab === value ? 'active' : 'inactive'}
      className={className}
    >
      {children}
    </div>
  );
}