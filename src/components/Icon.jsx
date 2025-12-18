// src/components/Icon.jsx
// Centralized icon component for consistent icon usage
import { 
  LayoutDashboard, Video, Users, FileVideo, Waves, Settings, Search, Plus, 
  ChevronLeft, Trophy, FileUp, X, Play, Send, Loader2, Check, TrendingDown,
  PlayCircle, ClipboardList, Key, UploadCloud, Cpu, Sparkles, Scan, PenTool, 
  Share2, Download, TrendingUp, LogOut, Image as ImageIcon, Camera, User, 
  Calendar, Clipboard, Bell, FileText, Timer, MessageSquare, Megaphone, UserPlus
} from 'lucide-react';

// Icon name to component mapping
const icons = {
  'layout-dashboard': LayoutDashboard,
  'video': Video,
  'users': Users,
  'file-video': FileVideo,
  'waves': Waves,
  'settings': Settings,
  'search': Search,
  'plus': Plus,
  'chevron-left': ChevronLeft,
  'trophy': Trophy,
  'file-up': FileUp,
  'x': X,
  'play': Play,
  'send': Send,
  'loader-2': Loader2,
  'check': Check,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'play-circle': PlayCircle,
  'clipboard-list': ClipboardList,
  'key': Key,
  'upload-cloud': UploadCloud,
  'cpu': Cpu,
  'sparkles': Sparkles,
  'scan': Scan,
  'pen-tool': PenTool,
  'share-2': Share2,
  'download': Download,
  'log-out': LogOut,
  'file-text': FileText,
  'message-square': MessageSquare,
  'megaphone': Megaphone,
  'user-plus': UserPlus,
  'image': ImageIcon,
  'camera': Camera,
  'user': User,
  'calendar': Calendar,
  'clipboard': Clipboard,
  'bell': Bell,
  'timer': Timer
};

/**
 * Icon component that renders Lucide icons by name
 * @param {Object} props
 * @param {string} props.name - Icon name (kebab-case)
 * @param {number} props.size - Icon size in pixels (default: 20)
 * @param {string} props.className - Additional CSS classes
 */
export default function Icon({ name, size = 20, className = '' }) {
  const LucideIcon = icons[name] || Waves;
  return <LucideIcon size={size} className={className} />;
}

// Also export individual icons for direct imports
export { 
  LayoutDashboard, Video, Users, FileVideo, Waves, Settings, Search, Plus, 
  ChevronLeft, Trophy, FileUp, X, Play, Send, Loader2, Check, TrendingDown,
  PlayCircle, ClipboardList, Key, UploadCloud, Cpu, Sparkles, Scan, PenTool, 
  Share2, Download, TrendingUp, LogOut, ImageIcon, Camera, User, 
  Calendar, Clipboard, Bell, FileText, Timer, MessageSquare, Megaphone, UserPlus
};

