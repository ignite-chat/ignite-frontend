import Avatar from './Avatar';
import { DialogContent, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';

const UserProfileDialogContent = ({ user }) => {
  if (!user) return null;

  return (
    <DialogContent className="max-w-[600px] overflow-hidden border-none p-0 shadow-2xl dark:bg-[#111214] dark:text-gray-100">
      <DialogTitle className="sr-only">User Profile - {user.name}</DialogTitle>

      {/* Banner Section */}
      <div
        className="h-28 w-full transition-all duration-300"
        style={{
          backgroundColor: user.banner_color || '#5865f2',
          backgroundImage: user.banner_url ? `url(${user.banner_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative px-6 pb-6 pt-16">
        {/* Avatar with Ring */}
        <div className="absolute -top-16 left-6">
          <div className="rounded-full border-[8px] border-white/5 bg-[#111214] transition-transform hover:scale-105">
            <Avatar user={user} className="size-32 cursor-default text-5xl" />
          </div>
          {/* Status Indicator */}
          <div className="absolute bottom-2 right-2 size-8 rounded-full border-[6px] border-white/5 bg-green-500" />
        </div>

        <div className="space-y-6">
          {/* User Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">{user.name}</h2>
            <div className="flex items-center gap-2">
              <p className="text-base text-gray-400">@{user.username}</p>
              {user.status && (
                <>
                  <span className="text-gray-600">•</span>
                  <p className="text-sm italic text-gray-500">"{user.status}"</p>
                </>
              )}
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Profile Sections Grid */}
          <div className="grid gap-6">
            <section>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                About Me
              </h3>
              <p className="text-[15px] leading-relaxed text-gray-300">
                {user.bio || 'This user has not set a bio yet. They prefer to stay mysterious!'}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <section>
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Member Since
                </h3>
                <p className="text-[14px] text-gray-300">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Late 2024'}
                </p>
              </section>

              {user.pronouns && (
                <section>
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Pronouns
                  </h3>
                  <p className="text-[14px] text-gray-300">{user.pronouns}</p>
                </section>
              )}
            </div>
          </div>

          {/* Footer Decoration */}
          <div className="flex gap-2 pt-2">
            <div className="h-1.5 w-full rounded-full bg-white/5" />
            <div className="h-1.5 w-1/4 rounded-full bg-primary/20" />
          </div>
        </div>
      </div>
    </DialogContent>
  );
};

export default UserProfileDialogContent;
