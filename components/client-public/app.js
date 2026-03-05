import React, { useState } from "react";
import { View } from "react-native";
import JoinOrCreateTable from "./components/JoinOrCreateTable";
import Menu from "./components/Menu.js";

export default function App() {
	const [userName, setUserName] = useState(null);

	return (
		<View style={{ flex: 1 }}>
			{!userName ? (
				<JoinOrCreateTable
					tableId="6960d0037aca682cfc81925a"
					onJoin={(name) => setUserName(name)}
				/>
			) : (
				<Menu />
			)}
		</View>
	);
}

//tableid: 6960d0037aca682cfc81925a grillz
//
//
//
//
