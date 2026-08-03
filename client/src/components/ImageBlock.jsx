import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Image as ImageIcon, Loader2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function ImageBlock({ block, onUpdate, readOnly = false }) {
  const content = block.content || {};
  const url = content.url || '';
  const align = content.align || 'center';
  const scale = content.scale || 100;
  const caption = content.caption || '';
  const blockTitle = content.title || '';

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('note-images')
        .getPublicUrl(filePath);

      onUpdate({ content: { ...content, url: data.publicUrl } });
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUpload(file);
          break;
        }
      }
    }
  };

  return (
    <div 
      className="rounded-xl border border-app-border bg-[#0d0d0d] overflow-hidden group transition-all hover:border-app-border-strong flex flex-col"
      onPaste={handlePaste}
      tabIndex={0} // To allow receiving paste events when focused
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-bg border-b border-app-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Image</span>
          {readOnly ? (
            blockTitle ? <span className="text-xs text-gray-400 ml-2">{blockTitle}</span> : null
          ) : (
            <input
              type="text"
              placeholder="Name this block..."
              value={blockTitle}
              onChange={(e) => onUpdate({ content: { ...content, title: e.target.value } })}
              className="bg-transparent border-none outline-none text-xs text-gray-400 placeholder-gray-600 ml-2 w-32 focus:text-gray-200 transition-colors"
            />
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col items-center justify-center min-h-[150px] relative outline-none focus:outline-none">
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-500/10 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-500/20 text-center z-10">
            {error}
          </div>
        )}

        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs">Uploading image...</span>
          </div>
        ) : !url ? (
          readOnly ? (
            <div className="text-gray-500 text-sm">No image provided</div>
          ) : (
            <div 
              className="w-full h-full min-h-[150px] border-2 border-dashed border-white/10 hover:border-primary/50 rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/5 transition-colors group/upload"
              onClick={() => fileInputRef.current?.click()}
            >
            <div className="p-3 bg-white/5 rounded-full group-hover/upload:bg-primary/20 transition-colors group-hover/upload:text-primary text-gray-500">
              <Upload size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 font-medium">Click to upload an image</p>
              <p className="text-xs text-gray-500 mt-1">Or paste an image from your clipboard</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={onFileInputChange} 
            />
          </div>
          )
        ) : (
          <div className={`w-full flex flex-col group/image relative ${align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'}`}>
            {/* Formatting Toolbar (visible on hover) */}
            {!readOnly && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/image:opacity-100 transition-opacity bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl p-1.5 flex items-center gap-2 z-10 backdrop-blur-md">
                <div className="flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5">
                  <button 
                    onClick={() => onUpdate({ content: { ...content, align: 'left' } })}
                    className={`p-1.5 rounded transition-colors ${align === 'left' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'}`}
                    title="Align Left"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button 
                    onClick={() => onUpdate({ content: { ...content, align: 'center' } })}
                    className={`p-1.5 rounded transition-colors ${align === 'center' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'}`}
                    title="Align Center"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button 
                    onClick={() => onUpdate({ content: { ...content, align: 'right' } })}
                    className={`p-1.5 rounded transition-colors ${align === 'right' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'}`}
                    title="Align Right"
                  >
                    <AlignRight size={14} />
                  </button>
                </div>
                
                <div className="w-px h-4 bg-white/10" />
                
                <div className="flex items-center gap-2 px-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Scale</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={scale} 
                    onChange={(e) => onUpdate({ content: { ...content, scale: parseInt(e.target.value) } })}
                    className="w-20 accent-primary"
                  />
                  <span className="text-[10px] text-gray-400 w-6 text-right">{scale}%</span>
                </div>
              </div>
            )}

            {/* Image */}
            <img 
              src={url} 
              alt={caption || "User uploaded image"} 
              className="rounded border border-white/10 shadow-lg object-contain transition-all"
              style={{ maxWidth: `${scale}%` }}
            />
            
            {/* Caption Input */}
            {(caption || !readOnly) && (
              <div className={`mt-3 w-full flex ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}>
                {readOnly ? (
                  <span className="text-xs text-gray-400 text-center">{caption}</span>
                ) : (
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => onUpdate({ content: { ...content, caption: e.target.value } })}
                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-primary outline-none text-xs text-gray-400 focus:text-gray-200 placeholder-gray-600 text-center transition-colors min-w-[200px]"
                    style={{ width: `${scale}%` }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
