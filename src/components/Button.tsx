import { ButtonHTMLAttributes } from "react";

export default function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      className={`px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}
