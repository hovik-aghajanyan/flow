const graphData = [
    {
        id: "frontend",
        label: "frontend",
        children: [
            { id: "html", label: "html", children: [] },
            {
                id: "css",
                label: "css",
                children: [
                    { id: "pure-css", label: "pure css", children: [] },
                    { id: "css-in-js", label: "css in js", children: [] },
                ],
            },
            { id: "js", label: "js", children: [
                    { id: "react", label: "react", children: [] },
                    { id: "angular", label: "angular", children: [] },
                    { id: "vue", label: "vue", children: [] },
                    { id: "svelte", label: "svelte", children: [] },
                    { id: "frameworks", label: "frameworks", children: [
                            { id: "next", label: "next", children: [] },
                            { id: "react-router", label: "react router", children: [] },
                            { id: "the-one-with-long-name", label: "the one with long name", children: [] },
                            { id: "tan-stack", label: "tan stack", children: [] },
                        ] },
                ] },
        ],
    },
    {
        id: "backend",
        label: "backend",
        children: [
            {
                id: "csharp",
                label: "c#",
                children: [
                    { id: "dotnet8", label: ".NET 8", children: [] },
                    { id: "dotnet9", label: ".NET 9", children: [] },
                    { id: "dotnet10", label: ".NET 10", children: [] },
                ],
            },
            { id: "java", label: "java", children: [] },
            { id: "go", label: "go", children: [] },
            { id: "python", label: "python", children: [] },
        ],
    },
    {
        id: "mobile",
        label: "mobile",
        children: [
            { id: "react-native", label: "react native", children: [] },
            {
                id: "android",
                label: "android",
                children: [
                    {
                        id: "v10",
                        label: "v10",
                        children: [
                            { id: "1", label: "1", children: [] },
                            { id: "2", label: "2", children: [] },
                            { id: "3", label: "3", children: [] },
                            { id: "4", label: "4", children: [] },
                        ],
                    },
                    { id: "v20", label: "v20", children: [] },
                    { id: "v30", label: "v30", children: [] },
                ],
            },
            { id: "ios", label: "ios", children: [] },
            { id: "kotlin", label: "kotlin", children: [] },
            { id: "webview", label: "webview", children: [] },
            { id: "blazor", label: "blazor", children: [] },
        ],
    },
];
export default graphData;