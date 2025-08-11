package com.knets.jr

import android.app.Activity
import android.os.Bundle
import android.widget.TextView
import android.widget.LinearLayout
import android.widget.Toast

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Create simple layout programmatically
        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL
        
        val textView = TextView(this)
        textView.text = "Knets Jr - Family Device Management"
        textView.textSize = 18f
        textView.setPadding(40, 40, 40, 40)
        
        layout.addView(textView)
        setContentView(layout)
        
        Toast.makeText(this, "Knets Jr App Launched Successfully", Toast.LENGTH_LONG).show()
    }
}