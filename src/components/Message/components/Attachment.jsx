import { useState } from 'react';
import { DownloadSimple, FileText } from '@phosphor-icons/react';
import ImageLightbox from './ImageLightbox';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'apng', 'avif'];

const isImageAttachment = (attachment) => {
  if (attachment.content_type?.startsWith('image/')) return true;
  const ext = attachment.filename?.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImageAttachment = ({ attachment, author, timestamp }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="block max-w-[400px] cursor-pointer"
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="max-h-[300px] rounded object-contain"
          loading="lazy"
          decoding="async"
        />
      </button>
      <ImageLightbox
        src={attachment.url}
        alt={attachment.filename}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        author={author}
        timestamp={timestamp}
      />
    </>
  );
};

const FileAttachment = ({ attachment }) => (
  <a
    href={attachment.url}
    target="_blank"
    rel="noopener noreferrer"
    download
    className="flex w-fit max-w-[400px] items-center gap-3 rounded-md border border-white/5 bg-[#2b2d31] px-4 py-3 transition-colors hover:bg-[#32353b]"
  >
    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-[#5865f2]/20">
      <FileText className="size-5 text-[#5865f2]" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium text-[#00a8fc] hover:underline">
        {attachment.filename}
      </div>
      <div className="text-xs text-[#949ba4]">{formatFileSize(attachment.size)}</div>
    </div>
    <DownloadSimple className="size-5 shrink-0 text-[#b5bac1]" />
  </a>
);

const Attachment = ({ attachment, author, timestamp }) => {
  if (isImageAttachment(attachment)) {
    return <ImageAttachment attachment={attachment} author={author} timestamp={timestamp} />;
  }
  return <FileAttachment attachment={attachment} />;
};

export default Attachment;
