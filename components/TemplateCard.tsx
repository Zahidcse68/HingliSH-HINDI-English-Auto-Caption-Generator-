import React from 'react';
import { Template } from '../types';
import { ICON_MAP } from '../constants';
import { Check } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, isSelected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(template.id)}
      className={`
        relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300
        ${isSelected ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/25' : 'border-slate-700 hover:border-slate-500 hover:scale-102'}
        bg-slate-800 h-48 flex flex-col justify-end
      `}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-40 group-hover:opacity-60 transition-opacity`} />
      
      {/* Icon */}
      <div className="absolute top-4 left-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white">
        {ICON_MAP[template.icon]}
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-4 right-4 p-1 bg-indigo-500 rounded-full text-white shadow-lg">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Content */}
      <div className="relative p-4 bg-gradient-to-t from-black/90 to-transparent">
        <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
        <p className="text-xs text-slate-300 line-clamp-2">{template.description}</p>
      </div>
    </div>
  );
};
