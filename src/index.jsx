import { render } from 'preact';

import preactLogo from './assets/preact.svg';
import './style.css';

export function App() {
	return (
		<div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
			<div class="max-w-4xl mx-auto text-center">
				<a href="https://preactjs.com" target="_blank" class="inline-block mb-8">
					<img src={preactLogo} alt="Preact logo" height="160" width="160" class="hover:drop-shadow-lg transition-all duration-300" />
				</a>
				<h1 class="text-4xl font-bold text-blue-800 mb-12">Get Started building Vite-powered Preact Apps</h1>
				<div class="grid md:grid-cols-3 gap-6">
					<Resource
						title="Learn Preact"
						description="If you're new to Preact, try the interactive tutorial to learn important concepts"
						href="https://preactjs.com/tutorial"
					/>
					<Resource
						title="Differences to React"
						description="If you're coming from React, you may want to check out our docs to see where Preact differs"
						href="https://preactjs.com/guide/v10/differences-to-react"
					/>
					<Resource
						title="Learn Vite"
						description="To learn more about Vite and how you can customize it to fit your needs, take a look at their excellent documentation"
						href="https://vitejs.dev"
					/>
				</div>
			</div>
		</div>
	);
}

function Resource(props) {
	return (
		<a href={props.href} target="_blank" class="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 text-left border border-gray-200 hover:border-blue-300">
			<h2 class="text-xl font-semibold text-gray-800 mb-2">{props.title}</h2>
			<p class="text-gray-600">{props.description}</p>
		</a>
	);
}

render(<App />, document.getElementById('app'));
