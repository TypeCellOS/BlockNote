export const HARDCODED_USERS = [
  {
    id: "user-1",
    username: "Kev",
    color: "#9810fa",
    avatarUrl: "/avatars/avater2-m.jpg",
  },
  {
    id: "user-2",
    username: "Matt",
    color: "#00ff00",
    avatarUrl: "/avatars/avatar3-m.jpg",
  },
  {
    id: "user-3",
    username: "Sef",
    color: "#ababffff",
    avatarUrl: "/avatars/avater5-m.jpg",
  },
  {
    id: "user-4",
    username: "Nicky",
    color: "#ff00ff",
    avatarUrl: "/avatars/avatar1-f.jpg",
  },
  {
    id: "user-5",
    username: "Sam",
    color: "#00ffff",
    avatarUrl: "/avatars/avatar7-m.jpg",
  },
  {
    id: "user-6",
    username: "Walter",
    color: "#ffff00",
    avatarUrl: "/avatars/avatar10-m.jpg",
  },
  {
    id: "user-7",
    username: "Amanda",
    color: "#ffa500",
    avatarUrl: "/avatars/avatar4-f.jpg",
  },
  {
    id: "user-8",
    username: "Sara",
    color: "#800080",
    avatarUrl: "/avatars/avatar6-f.jpg",
  },
];

const getRandomUser = () => {
  return HARDCODED_USERS[Math.floor(Math.random() * HARDCODED_USERS.length)];
};

// The resolveUsers function fetches information about your users
// (e.g. their name, avatar, etc.). Usually, you'd fetch this from your
// own database or user management system.
// Here, we just return the hardcoded users
export async function resolveUsers(userIds: string[]) {
  // fake a (slow) network request
  await new Promise((resolve) => setTimeout(resolve, 500));

  return HARDCODED_USERS.filter((user) => userIds.includes(user.id));
}

// "Uploads" a file by encoding it as a base64 data URL. In a real app you'd
// replace this with an upload to your own backend that returns a URL to the
// stored file.
export async function uploadFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
