import Link from "next/link";

export default function InWorkPage(){
    return <div className="text-center pt-16">
        <h1 className="pb-4 text-7xl">In Progress!!</h1>
        <Link className="text-4xl text-[#004e99] " href={'/'}>Return Back to Home Page</Link>
    </div>
}