import React, { useState } from "react";
import { View } from "react-native";
import JoinOrCreateTable from "./components/JoinOrCreateTable";
import Menu from "./components/Menu.js";

export default function App() {
	const [userName, setUserName] = useState(null);

	return (
		<View style={{ flex: 1 }}>
			{!userName ? (
				<JoinOrCreateTable tableId="686af692bb4cba684ff3b757" onJoin={(name) => setUserName(name)} />
			)}
		</View>
	);
}
