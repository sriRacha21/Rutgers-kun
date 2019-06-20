cmd_Release/native.node := ln -f "Release/obj.target/native.node" "Release/native.node" 2>/dev/null || (rm -rf "Release/native.node" && cp -af "Release/obj.target/native.node" "Release/native.node")
