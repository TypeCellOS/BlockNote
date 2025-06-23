import dynamic from "next/dynamic";

const DynamicExampleCards = dynamic(() => import("./ExampleCards"), {});

export default DynamicExampleCards;
