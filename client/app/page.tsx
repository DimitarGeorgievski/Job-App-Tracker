'use client'
import Navbar from "@/components/navbar/Navbar";
import Image from "next/image";
import { User } from "./lib/hooks/user";

export default function Home() {
  const {data: user} = User()
  return (
    <div className="">
      <Navbar user={user}/>
    </div>
  );
}
