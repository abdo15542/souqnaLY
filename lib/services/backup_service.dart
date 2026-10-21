import 'dart:io';
import 'package:cross_file/cross_file.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../db.dart';
class BackupService{
  static Future<File>createBackupFile()async{final json=await LocalDB.exportBackup();final dir=await getApplicationDocumentsDirectory();final stamp=DateTime.now().toIso8601String().replaceAll(':','-').split('.').first;final file=File(p.join(dir.path,'souqna_backup_$stamp.json'));await file.writeAsString(json);return file;}
  static Future<void>shareBackup()async{final file=await createBackupFile();await Share.shareXFiles([XFile(file.path)],text:'نسخة احتياطية من سوقنا');}
  static Future<bool>pickAndRestore()async{final result=await FilePicker.platform.pickFiles(type:FileType.custom,allowedExtensions:['json']);if(result==null||result.files.isEmpty)return false;final path=result.files.single.path;if(path==null)return false;final content=await File(path).readAsString();await LocalDB.restoreBackup(content);return true;}
}
