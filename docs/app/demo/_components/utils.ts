export const HARDCODED_USERS = [
  {
    id: "user-1",
    username: "Kev",
    color: "#9810fa",
  },
  {
    id: "user-2",
    username: "Matt",
    color: "#00ff00",
  },
  {
    id: "user-3",
    username: "Sef",
    color: "#ababffff",
  },
  {
    id: "user-4",
    username: "Nicky",
    color: "#ff00ff",
  },
  {
    id: "user-5",
    username: "Sam",
    color: "#00ffff",
  },
  {
    id: "user-6",
    username: "Walter",
    color: "#ffff00",
  },
  {
    id: "user-7",
    username: "Amanda",
    color: "#ffa500",
  },
  {
    id: "user-8",
    username: "Sara",
    color: "#800080",
  },
];

export const getRandomUser = () => {
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

// Uploads a file to tmpfiles.org and returns the URL to the uploaded file.
export async function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);

  const ret = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: body,
  });
  return (await ret.json()).data.url.replace(
    "tmpfiles.org/",
    "tmpfiles.org/dl/",
  );
}
