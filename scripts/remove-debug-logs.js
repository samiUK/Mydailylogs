const fs = require("fs")
const path = require("path")

function removeDebugLogs(dir) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && !file.startsWith(".") && file !== "node_modules") {
      removeDebugLogs(filePath)
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      let content = fs.readFileSync(filePath, "utf8")

      // Remove console.log statements with [v0] prefix
      content = content.replace(/\s*console\.log$$[^)]*\[v0\][^)]*$$;?\n?/g, "")

      // Remove other debug console.log statements
      content = content.replace(/\s*console\.log$$[^)]*debug[^)]*$$;?\n?/g, "")

      fs.writeFileSync(filePath, content)
      console.log(`Cleaned debug logs from: ${filePath}`)
    }
  })
}

// Run the cleanup
removeDebugLogs("./app")
removeDebugLogs("./components")
console.log("Debug log cleanup complete!")
