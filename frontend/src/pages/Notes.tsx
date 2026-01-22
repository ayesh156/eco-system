import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  StickyNote, Plus, Search, X, LayoutGrid, List, Pin, PinOff,
  MoreVertical, Edit2, Trash2, Star, StarOff, Clock,
  Archive, ArchiveRestore, Check, Copy, Tag,
  Filter, RefreshCw, SortAsc, SortDesc,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye
} from 'lucide-react';

// Note interface
interface Note {
  id: string;
  title: string;
  description: string;
  color: string;
  isPinned: boolean;
  isStarred: boolean;
  isArchived: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Available note colors with better contrast
const noteColors = [
  { name: 'Default', value: 'default', light: 'bg-white', dark: 'bg-slate-800/50', border: { light: 'border-slate-200', dark: 'border-slate-700' } },
  { name: 'Red', value: 'red', light: 'bg-red-50', dark: 'bg-red-900/30', border: { light: 'border-red-200', dark: 'border-red-800/50' } },
  { name: 'Orange', value: 'orange', light: 'bg-orange-50', dark: 'bg-orange-900/30', border: { light: 'border-orange-200', dark: 'border-orange-800/50' } },
  { name: 'Yellow', value: 'yellow', light: 'bg-yellow-50', dark: 'bg-yellow-900/30', border: { light: 'border-yellow-200', dark: 'border-yellow-800/50' } },
  { name: 'Green', value: 'green', light: 'bg-emerald-50', dark: 'bg-emerald-900/30', border: { light: 'border-emerald-200', dark: 'border-emerald-800/50' } },
  { name: 'Teal', value: 'teal', light: 'bg-teal-50', dark: 'bg-teal-900/30', border: { light: 'border-teal-200', dark: 'border-teal-800/50' } },
  { name: 'Blue', value: 'blue', light: 'bg-blue-50', dark: 'bg-blue-900/30', border: { light: 'border-blue-200', dark: 'border-blue-800/50' } },
  { name: 'Purple', value: 'purple', light: 'bg-purple-50', dark: 'bg-purple-900/30', border: { light: 'border-purple-200', dark: 'border-purple-800/50' } },
  { name: 'Pink', value: 'pink', light: 'bg-pink-50', dark: 'bg-pink-900/30', border: { light: 'border-pink-200', dark: 'border-pink-800/50' } },
];

// Sample notes data
const sampleNotes: Note[] = [
  {
    id: '1',
    title: 'Important Customer Follow-up',
    description: 'Call Mr. Perera about the laptop repair status. He requested an update on the screen replacement for his Dell XPS 15. Parts expected to arrive by Thursday.',
    color: 'yellow',
    isPinned: true,
    isStarred: true,
    isArchived: false,
    tags: ['customer', 'urgent'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Inventory Restock List',
    description: '• iPhone 15 screen protectors (50 units)\n• USB-C cables (100 units)\n• Laptop cooling pads (20 units)\n• Wireless mice (30 units)\n• Keyboard covers (40 units)',
    color: 'green',
    isPinned: true,
    isStarred: false,
    isArchived: false,
    tags: ['inventory'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Meeting Notes - Staff Training',
    description: 'Discussed new POS system training schedule. All staff members need to complete the training by end of month. Sessions will be held every Tuesday and Thursday at 5 PM.',
    color: 'blue',
    isPinned: false,
    isStarred: true,
    isArchived: false,
    tags: ['meeting', 'training'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'New Supplier Contact',
    description: 'ABC Electronics - Contact: Mr. Kumar\nPhone: 077-1234567\nEmail: kumar@abcelectronics.lk\nSpecializes in mobile accessories and phone parts.',
    color: 'purple',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['supplier'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'Weekly Sales Target',
    description: 'Target: Rs. 500,000\nCurrent: Rs. 350,000\nRemaining: Rs. 150,000\n\nFocus on laptop sales and repair services to meet the target.',
    color: 'orange',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['sales'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    title: 'Warranty Claims Pending',
    description: '3 warranty claims need to be processed:\n1. HP Laptop - Motherboard issue\n2. Samsung Phone - Battery replacement\n3. LG Monitor - Dead pixels',
    color: 'red',
    isPinned: false,
    isStarred: true,
    isArchived: false,
    tags: ['warranty', 'urgent'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '7',
    title: 'Product Ideas for Q2',
    description: 'Consider adding:\n• Laptop bags and cases\n• USB hubs with power delivery\n• Portable SSD storage\n• Webcam covers\n• Screen cleaning kits',
    color: 'teal',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['ideas', 'products'],
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '8',
    title: 'Staff Schedule - January',
    description: 'Morning shift: 8 AM - 2 PM\nEvening shift: 2 PM - 8 PM\n\nWeekend rotation schedule needs updating.',
    color: 'default',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['staff', 'schedule'],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '9',
    title: 'Old Promotion Notes',
    description: 'Black Friday promotion details from last year. Discounts offered: 15% on laptops, 20% on accessories.',
    color: 'pink',
    isPinned: false,
    isStarred: false,
    isArchived: true,
    tags: ['promotion', 'archived'],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '10',
    title: 'Service Center Contact',
    description: 'Samsung Service Center\nAddress: 123 Galle Road, Colombo\nPhone: 011-2345678\nHours: 9 AM - 5 PM (Mon-Sat)',
    color: 'blue',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['service', 'contact'],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '11',
    title: 'Marketing Ideas',
    description: 'Social media campaign ideas:\n• Product showcase reels\n• Customer testimonials\n• Behind the scenes content\n• Tech tips and tricks',
    color: 'purple',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['marketing', 'social'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '12',
    title: 'Competitor Analysis',
    description: 'Check pricing at:\n• TechMart - Majestic City\n• Dialog Shop - Liberty Plaza\n• Singer Mega - Colombo 3',
    color: 'orange',
    isPinned: false,
    isStarred: false,
    isArchived: false,
    tags: ['research', 'competitor'],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

type ViewMode = 'grid' | 'table';

export const Notes: React.FC = () => {
  const { theme } = useTheme();
  const [notes, setNotes] = useState<Note[]>(sampleNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(viewMode === 'table' ? 10 : 8);
  
  // Modal states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  // Dropdown states
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTag, showArchived, showStarredOnly, colorFilter]);

  // Update items per page when view mode changes
  useEffect(() => {
    if (viewMode === 'table') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(8);
    }
    setCurrentPage(1);
  }, [viewMode]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    const filtered = notes.filter(note => {
      // Archive filter
      if (showArchived !== note.isArchived) return false;
      
      // Starred filter
      if (showStarredOnly && !note.isStarred) return false;
      
      // Tag filter
      if (filterTag && !note.tags.includes(filterTag)) return false;
      
      // Color filter
      if (colorFilter && note.color !== colorFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          note.description.toLowerCase().includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [notes, searchQuery, filterTag, showArchived, showStarredOnly, colorFilter, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNotes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotes, currentPage, itemsPerPage]);

  // Separate pinned and unpinned notes for grid view
  const pinnedNotes = paginatedNotes.filter(note => note.isPinned);
  const unpinnedNotes = paginatedNotes.filter(note => !note.isPinned);

  // Generate page numbers
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Check if filters are active
  const hasActiveFilters = searchQuery || filterTag || showStarredOnly || showArchived || colorFilter;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterTag(null);
    setShowStarredOnly(false);
    setShowArchived(false);
    setColorFilter(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get color classes for cards
  const getColorClasses = (colorValue: string) => {
    const color = noteColors.find(c => c.value === colorValue) || noteColors[0];
    return theme === 'dark' ? color.dark : color.light;
  };

  // Get border color classes
  const getBorderClasses = (colorValue: string) => {
    const color = noteColors.find(c => c.value === colorValue) || noteColors[0];
    return theme === 'dark' ? color.border.dark : color.border.light;
  };

  // Get color indicator for table view
  const getColorIndicator = (colorValue: string) => {
    switch (colorValue) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-emerald-500';
      case 'teal': return 'bg-teal-500';
      case 'blue': return 'bg-blue-500';
      case 'purple': return 'bg-purple-500';
      case 'pink': return 'bg-pink-500';
      default: return theme === 'dark' ? 'bg-slate-600' : 'bg-slate-400';
    }
  };

  // Note actions
  const handleTogglePin = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() } : note
    ));
  };

  const handleToggleStar = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, isStarred: !note.isStarred, updatedAt: new Date().toISOString() } : note
    ));
  };

  const handleToggleArchive = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, isArchived: !note.isArchived, isPinned: false, updatedAt: new Date().toISOString() } : note
    ));
    setOpenDropdownId(null);
  };


  const handleDuplicateNote = (note: Note) => {
    const newNote: Note = {
      ...note,
      id: Date.now().toString(),
      title: `${note.title} (Copy)`,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setOpenDropdownId(null);
  };

  const handleDeleteNote = () => {
    if (noteToDelete) {
      setNotes(prev => prev.filter(note => note.id !== noteToDelete.id));
      setNoteToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSaveNote = (noteData: Partial<Note>) => {
    if (selectedNote) {
      // Update existing note
      setNotes(prev => prev.map(note => 
        note.id === selectedNote.id 
          ? { ...note, ...noteData, updatedAt: new Date().toISOString() } 
          : note
      ));
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        title: noteData.title || 'Untitled Note',
        description: noteData.description || '',
        color: noteData.color || 'default',
        isPinned: false,
        isStarred: false,
        isArchived: false,
        tags: noteData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes(prev => [newNote, ...prev]);
    }
    setIsNoteModalOpen(false);
    setSelectedNote(null);
  };

  // Note Card Component for Grid View
  const NoteCard: React.FC<{ note: Note }> = ({ note }) => {
    const isDropdownOpen = openDropdownId === note.id;

    return (
      <div
        className={`group relative rounded-2xl border transition-all duration-300 hover:shadow-xl p-4 ${getColorClasses(note.color)} ${getBorderClasses(note.color)}`}
      >
        {/* Pin indicator */}
        {note.isPinned && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Pin className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Content */}
        <div 
          className="flex-1 cursor-pointer mb-3"
          onClick={() => {
            setSelectedNote(note);
            setModalMode('view');
            setIsNoteModalOpen(true);
          }}
        >
          {/* Title */}
          <h3 className={`font-semibold mb-2 line-clamp-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {note.title}
          </h3>
          
          {/* Description */}
          <p className={`text-sm whitespace-pre-line line-clamp-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {note.description}
          </p>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 text-slate-300'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between mt-3 pt-3 border-t ${theme === 'dark' ? 'border-slate-700/30' : 'border-slate-200/50'}`}>
          {/* Date */}
          <div className={`flex items-center gap-1.5 text-xs ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {formatDate(note.updatedAt)}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* View Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNote(note);
                setModalMode('view');
                setIsNoteModalOpen(true);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50'
                  : 'text-slate-500 hover:text-emerald-500 hover:bg-slate-100'
              }`}
              title="View note"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Star Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStar(note.id);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                note.isStarred
                  ? 'text-amber-500 bg-amber-500/10'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-700/50'
                  : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'
              }`}
              title={note.isStarred ? 'Unstar' : 'Star'}
            >
              {note.isStarred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </button>

            {/* Pin Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(note.id);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                note.isPinned
                  ? 'text-emerald-500 bg-emerald-500/10'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50'
                  : 'text-slate-500 hover:text-emerald-500 hover:bg-slate-100'
              }`}
              title={note.isPinned ? 'Unpin' : 'Pin'}
            >
              {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>

            {/* More Options */}
            <div className="relative" ref={isDropdownOpen ? dropdownRef : undefined}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownId(isDropdownOpen ? null : note.id);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-50 overflow-hidden ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-white border-slate-200'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNote(note);
                      setModalMode('edit');
                      setIsNoteModalOpen(true);
                      setOpenDropdownId(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700/50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Note
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateNote(note);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700/50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchive(note.id);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700/50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {note.isArchived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4" />
                        Unarchive
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Archive
                      </>
                    )}
                  </button>
                  <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteToDelete(note);
                      setIsDeleteModalOpen(true);
                      setOpenDropdownId(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Notes
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Keep track of important information and reminders
          </p>
        </div>
        
        <button 
          onClick={() => {
            setSelectedNote(null);
            setModalMode('edit');
            setIsNoteModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Note
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {notes.filter(n => !n.isArchived).length}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total Notes</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Pin className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {notes.filter(n => n.isPinned && !n.isArchived).length}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Pinned</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {notes.filter(n => n.isStarred && !n.isArchived).length}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Starred</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500/10 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {notes.filter(n => n.isArchived).length}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Archived</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`p-1 rounded-full ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {[filterTag, showStarredOnly, showArchived, colorFilter].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filters */}
              <button
                onClick={() => {
                  setShowStarredOnly(!showStarredOnly);
                  setShowArchived(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  showStarredOnly
                    ? 'bg-amber-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Star className="w-4 h-4" />
                Starred
              </button>

              <button
                onClick={() => {
                  setShowArchived(!showArchived);
                  setShowStarredOnly(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  showArchived
                    ? 'bg-slate-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Archive className="w-4 h-4" />
                Archived
              </button>

              {/* Separator */}
              <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />

              {/* Color Filter */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Color:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setColorFilter(null)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      colorFilter === null
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                        : theme === 'dark' ? 'border-slate-600' : 'border-slate-300'
                    } ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}
                    title="All colors"
                  >
                    {colorFilter === null && <Check className="w-3 h-3 text-emerald-500" />}
                  </button>
                  {noteColors.slice(1).map(color => (
                    <button
                      key={color.value}
                      onClick={() => setColorFilter(colorFilter === color.value ? null : color.value)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        theme === 'dark' ? color.dark : color.light
                      } ${
                        colorFilter === color.value
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : theme === 'dark' ? 'border-slate-600' : 'border-slate-200'
                      }`}
                      title={color.name}
                    >
                      {colorFilter === color.value && <Check className="w-3 h-3 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separator */}
              {allTags.length > 0 && (
                <>
                  <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
                  
                  {/* Tag Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Tags:</span>
                    {allTags.slice(0, 6).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          filterTag === tag
                            ? 'bg-purple-500 text-white'
                            : theme === 'dark'
                              ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes Display */}
      {filteredNotes.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View */
          <>
            <div className="space-y-6">
              {/* Pinned Notes Section */}
              {pinnedNotes.length > 0 && !showArchived && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Pin className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <h2 className={`text-sm font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Pinned
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pinnedNotes.map(note => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                </div>
              )}

              {/* Unpinned Notes Section */}
              {unpinnedNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && !showArchived && (
                    <div className="flex items-center gap-2 mb-4">
                      <StickyNote className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                      <h2 className={`text-sm font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Others
                      </h2>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unpinnedNotes.map(note => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grid Pagination */}
            {totalPages > 1 && (
              <div className={`mt-4 p-4 rounded-2xl border ${
                theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredNotes.length)} of {filteredNotes.length} notes
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                      <div className={`flex items-center rounded-full p-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {[4, 8, 12, 16].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setItemsPerPage(num);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              itemsPerPage === num
                                ? 'bg-emerald-500 text-white shadow-md'
                                : theme === 'dark'
                                  ? 'text-slate-400 hover:text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="hidden sm:flex items-center gap-1">
                      {getPageNumbers.map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page as number)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                              currentPage === page
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                : theme === 'dark'
                                  ? 'hover:bg-slate-700 text-slate-300'
                                  : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                    </div>

                    <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-medium ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Table View */
          <div className={`rounded-2xl border overflow-hidden ${
            theme === 'dark' 
              ? 'bg-slate-800/30 border-slate-700/50' 
              : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Note
                    </th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Tags
                    </th>
                    <th className={`text-center px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Status
                    </th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Updated
                    </th>
                    <th className={`text-right px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNotes.map((note) => (
                    <tr 
                      key={note.id}
                      className={`border-b transition-colors ${
                        theme === 'dark' 
                          ? 'border-slate-700/30 hover:bg-slate-800/30' 
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/title"
                          onClick={() => {
                            setSelectedNote(note);
                            setModalMode('view');
                            setIsNoteModalOpen(true);
                          }}
                        >
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorIndicator(note.color)}`} />
                          <div className="min-w-0">
                            <p className={`font-medium truncate transition-colors ${theme === 'dark' ? 'text-white group-hover/title:text-emerald-400' : 'text-slate-900 group-hover/title:text-emerald-600'}`}>
                              {note.title}
                            </p>
                            <p className={`text-sm truncate max-w-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {note.description.replace(/\n/g, ' ').slice(0, 60)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {note.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                theme === 'dark'
                                  ? 'bg-slate-700/50 text-slate-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              +{note.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {note.isPinned && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}>
                              <Pin className="w-3 h-3" />
                            </span>
                          )}
                          {note.isStarred && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                            }`}>
                              <Star className="w-3 h-3 fill-current" />
                            </span>
                          )}
                          {note.isArchived && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === 'dark' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Archive className="w-3 h-3" />
                            </span>
                          )}
                          {!note.isPinned && !note.isStarred && !note.isArchived && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(note.updatedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedNote(note);
                              setModalMode('view');
                              setIsNoteModalOpen(true);
                            }}
                            className={`p-2 rounded-xl transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedNote(note);
                              setModalMode('edit');
                              setIsNoteModalOpen(true);
                            }}
                            className={`p-2 rounded-xl transition-colors ${
                              theme === 'dark' ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleStar(note.id)}
                            className={`p-2 rounded-xl transition-colors ${
                              note.isStarred
                                ? 'text-amber-500 bg-amber-500/10'
                                : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title={note.isStarred ? 'Unstar' : 'Star'}
                          >
                            {note.isStarred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleTogglePin(note.id)}
                            className={`p-2 rounded-xl transition-colors ${
                              note.isPinned
                                ? 'text-blue-500 bg-blue-500/10'
                                : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title={note.isPinned ? 'Unpin' : 'Pin'}
                          >
                            {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => {
                              setNoteToDelete(note);
                              setIsDeleteModalOpen(true);
                            }}
                            className={`p-2 rounded-xl transition-colors ${
                              theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredNotes.length)} of {filteredNotes.length} notes
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                    <div className={`flex items-center rounded-full p-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      {[5, 10, 20, 50].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setItemsPerPage(num);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            itemsPerPage === num
                              ? 'bg-emerald-500 text-white shadow-md'
                              : theme === 'dark'
                                ? 'text-slate-400 hover:text-white'
                                : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === 1
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="hidden sm:flex items-center gap-1">
                      {getPageNumbers.map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page as number)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                              currentPage === page
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                : theme === 'dark'
                                  ? 'hover:bg-slate-700 text-slate-300'
                                  : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                    </div>

                    <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-medium ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className={`text-center py-16 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <StickyNote className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {hasActiveFilters ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters 
              ? 'Try adjusting your filters or search query' 
              : 'Create your first note to get started'}
          </p>
          {!hasActiveFilters && (
            <button 
              onClick={() => {
                setSelectedNote(null);
                setModalMode('edit');
                setIsNoteModalOpen(true);
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Create Note
            </button>
          )}
        </div>
      )}

      {/* Note Form Modal */}
      <NoteFormModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setSelectedNote(null);
        }}
        onSave={handleSaveNote}
        note={selectedNote}
        initialMode={modalMode}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl p-6 ${
            theme === 'dark' ? 'bg-slate-900 border border-slate-700/50' : 'bg-white shadow-xl'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Delete Note
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Are you sure you want to delete "<span className="font-medium">{noteToDelete.title}</span>"?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setNoteToDelete(null);
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                className="px-4 py-2 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Note Form Modal Component
interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
  note: Note | null;
  initialMode: 'view' | 'edit';
}

const NoteFormModal: React.FC<NoteFormModalProps> = ({ isOpen, onClose, onSave, note, initialMode }) => {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Initialize form when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setDescription(note.description);
      setTags(note.tags);
      setIsEditing(initialMode === 'edit');
    } else {
      setTitle('');
      setDescription('');
      setTags([]);
      setIsEditing(true);
    }
  }, [note, isOpen, initialMode]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }
    onSave({ title, description, tags });
    setIsEditing(false);
  };

  // Instant color change - no save needed
  const handleColorChange = (newColor: string) => {
    if (note) {
      onSave({ ...note, color: newColor });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border border-slate-700/50' : 'bg-white shadow-xl'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-500/10'
            }`}>
              <StickyNote className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {note ? (isEditing ? 'Edit Note' : 'View Note') : 'New Note'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {note && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-800 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Title Input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Title {isEditing && <span className="text-red-500">*</span>}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className={`w-full px-4 py-3 rounded-xl border transition-all text-lg font-medium ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            ) : (
              <h3 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {title}
              </h3>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Description
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write your note here..."
                rows={6}
                className={`w-full px-4 py-3 rounded-xl border transition-all resize-none ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            ) : (
              <div className={`px-4 py-3 rounded-xl whitespace-pre-wrap ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {description || <span className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}>No description</span>}
              </div>
            )}
          </div>

          {/* Color Picker - Edit Mode Only */}
          {isEditing && (
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {noteColors.map(c => (
                  <button
                    key={c.value}
                    onClick={() => handleColorChange(c.value)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                      theme === 'dark' ? c.dark : c.light
                    } ${
                      note && note.color === c.value
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-110'
                        : theme === 'dark' 
                          ? 'border-slate-600 hover:border-slate-500 hover:scale-105' 
                          : 'border-slate-200 hover:border-slate-300 hover:scale-105'
                    } cursor-pointer`}
                    title={c.name}
                  >
                    {note && note.color === c.value && (
                      <Check className="w-5 h-5 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Tags
            </label>
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add a tag..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                          theme === 'dark'
                            ? 'bg-slate-700/50 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className={`ml-1 p-0.5 rounded-full transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? tags.map(tag => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-slate-700/50 text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {tag}
                  </span>
                )) : (
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>No tags</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  if (note) {
                    setIsEditing(false);
                    // Reset to original values
                    setTitle(note.title);
                    setDescription(note.description);
                    setTags(note.tags);
                  } else {
                    onClose();
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {note ? 'Save Changes' : 'Create Note'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
