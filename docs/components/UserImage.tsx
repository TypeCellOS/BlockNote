import Image from "next/image";

interface User {
  image?: string | null;
  name?: string | null;
}

interface UserImageProps {
  user: User;
}

export const UserImage = ({ user }: UserImageProps) => {
  if (user.image) {
    return (
      <Image
        className="size-6 rounded-full"
        src={user.image}
        alt={user.name || "User avatar"}
        width={50}
        height={50}
      />
    );
  }

  return (
    <div className="flex size-6 items-center justify-center rounded-full bg-indigo-400 text-xs font-semibold dark:bg-indigo-600">
      {user.name ? (
        user.name.substring(0, 2).toUpperCase()
      ) : (
        <svg
          fill="currentColor"
          viewBox="0 -960 960 960"
          aria-hidden="true"
          className="size-4 text-white"
        >
          <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-240v-32q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v32q0 33-23.5 56.5T720-160H240q-33 0-56.5-23.5T160-240Z" />
        </svg>
      )}
    </div>
  );
};
